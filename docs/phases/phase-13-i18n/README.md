# Phase 13 — i18n / Localization System (core + R3F + demo)

**Status**: Planned | **Owner**: Daniel Martínez Sebastián | **Version target**: v0.4.0

**Planned**: 2026-05-31

---

## 🎯 Why

Hoy las traducciones viven 100% en `apps/web-demo/demo-content/dialogs/`:

- `Locale = "es" | "en"` está **hardcodeado** (union estricta) → imposible añadir un idioma sin tocar tipos.
- `getRandomPhrase(key, locale = "es")` recibe el locale como parámetro y siempre cae a `es`. No hay store ni evento de cambio.
- El renderer R3F recibe el resolver por **DI** (`getPhrase` prop en `GameTouchSpriteRuntime`), pero no sabe nada de "idioma actual".
- No hay forma de:
  - cambiar idioma en runtime (menú "Idioma" en inventario / settings),
  - auto-detectar el idioma del usuario (`navigator.language`, cookie de Next.js, header),
  - persistir la elección (recarga vuelve a `es`),
  - integrarse con el routing i18n de Next.js (`/es/...`, `/en/...`, `next-intl`).

Esta fase introduce un **sistema de i18n agnóstico** con tres niveles de uso:

1. **Detección automática** (default sano): el adapter lee `navigator.language`, lo encaja contra los idiomas registrados y persiste en `localStorage`.
2. **Switcher manual**: componente `<LocaleSwitcher />` que el dev monta donde quiera (e.g. dentro de `InventoryUI`).
3. **Integración con el framework**: recetas para Next.js (`i18n` config nativa + `next-intl`) que enchufan el locale del routing al engine.

**Principio**: Core sigue agnóstico (sin `navigator`, `document`, `cookies`, librerías de i18n). Se introduce un `I18nPort` igual que ya tenemos con `AudioPort` / `StoragePort` / `TimerPort`.

---

## 📋 Diseño rápido

### 1. Tipos en core

```typescript
// Locale ya no es union — pasa a ser string para permitir cualquier código BCP-47.
export type Locale = string; // "es", "en", "es-MX", "pt-BR", "fr"...

export type DialogKey = string;

export type DialogEntry = {
  /** Una o varias frases. Cuando haya múltiples se elige una aleatoria. */
  phrases: string[];
};

export type DialogDictionary = Record<DialogKey, DialogEntry>;

/** Mapa de locale → diccionario. Sustituye al `DialogLocales` del demo. */
export type LocaleDictionaries = Record<Locale, DialogDictionary>;

export interface I18nConfig {
  /** Locale por defecto si la detección falla. */
  defaultLocale: Locale;
  /** Locale al que cae el lookup si la clave no existe en el activo. */
  fallbackLocale: Locale;
  /** Locales habilitados (whitelist para el switcher y la detección). */
  availableLocales: Locale[];
}

export interface I18nState {
  locale: Locale;
  availableLocales: Locale[];
  fallbackLocale: Locale;
}
```

### 2. `I18nPort` (nuevo puerto en `engine-core/src/ports/`)

```typescript
export interface I18nPort {
  /** Locale inicial — leído de storage, navigator, cookie, etc. */
  detectLocale(): Locale | null;
  /** Persistir el locale elegido por el usuario. */
  persistLocale(locale: Locale): void;
  /** Limpiar persistencia (logout, reset). */
  clearLocale?(): void;
}
```

Headless adapter (`HeadlessI18nAdapter`) para tests: no-op + grabación.

### 3. State en core

`i18nStore.ts` — store dedicado:

```typescript
{
  locale: Locale;
  availableLocales: Locale[];
  fallbackLocale: Locale;
}
```

Setters (`setLocale`, `setAvailableLocales`), suscripción y serialización vía `I18nPort.persistLocale` (no hardcodea storage).

### 4. Dictionary registry + translator

Funciones puras agnósticas (no React, no window):

```typescript
// Registro acumulativo — el demo puede llamar varias veces (un módulo por dominio).
registerDictionary(locale: Locale, dict: DialogDictionary): void;
registerDictionaries(dicts: LocaleDictionaries): void;

// Lookup: locale activo → fallbackLocale → key (string crudo).
translate(key: DialogKey, opts?: { vars?: Record<string, string | number> }): string;
getRandomPhrase(key: DialogKey): string;
```

Soporta interpolación simple `{{var}}` (regex). Pluralización ICU queda fuera de scope (Phase 14+).

### 5. Comandos y eventos en core

```typescript
// Events emitidos por core
| { type: "i18n:localeChanged"; locale: Locale; previous: Locale }
| { type: "i18n:dictionaryUpdated"; locale: Locale; keysAdded: number }

// Commands consumidos por core
| { type: "i18n:setLocale"; locale: Locale }
| { type: "i18n:registerDictionary"; locale: Locale; dict: DialogDictionary }
```

### 6. Renderer / Platform (web)

- **Adapter web** (`apps/web-demo/app/lib/platform-web-i18n.ts`):
  - `webI18nAdapter` lee `localStorage["i18n-locale"]`, si no existe encaja `navigator.language` contra los `availableLocales`, si no cae a `defaultLocale`.
  - SSR-safe (todas las operaciones devuelven `null` si `typeof window === "undefined"`).
- **Hook R3F** (`packages/engine-renderer-r3f/src/hooks/useI18n.ts`):
  - `useI18n()` → `{ locale, setLocale, t, getPhrase, availableLocales }`.
  - Suscribe al `i18nStore`, re-renderiza cuando cambia el locale.
- **Componente opcional** (`packages/engine-renderer-r3f/src/components/LocaleSwitcher.tsx`):
  - Dropdown / botones que llaman `setLocale`. Renderless-friendly (acepta `renderOption` prop).

### 7. Integración con Next.js (recetas, no código en core)

Tres patrones documentados en `tasks/10-nextjs-recipes.md`:

| Patrón | Cuándo | Cómo |
|---|---|---|
| **Browser auto + localStorage** | App SPA simple | Default `webI18nAdapter`. Cero config Next.js. |
| **Next.js native i18n routing** | Necesitas URLs `/es/...`, `/en/...` | `next.config.js` con `i18n: { locales, defaultLocale }`; un `LocaleSyncProvider` lee `useRouter().locale` y dispatcha `i18n:setLocale`. |
| **`next-intl`** | Necesitas ICU MessageFormat, fechas, plurales | Mantén `next-intl` para UI estática; engine usa adapter que lee `useLocale()` de `next-intl` y se sincroniza. |

---

## 🏗️ Arquitectura por capas

```
┌──────────────────────────────────────────────────┐
│ UI (apps/web-demo) — LocaleSwitcher, settings   │
├──────────────────────────────────────────────────┤
│ R3F (engine-renderer-r3f) — useI18n hook,       │
│   <LocaleSwitcher /> opcional                   │
├──────────────────────────────────────────────────┤
│ Core (engine-core) — types, state, registry,    │
│   translator, I18nPort, commands, events        │
├──────────────────────────────────────────────────┤
│ Platform (web-demo) — webI18nAdapter            │
│   (+ Next.js sync provider opcional)            │
└──────────────────────────────────────────────────┘
```

**Regla de oro**: ningún `navigator.`, `localStorage.`, `document.cookie`, `useRouter`, `useLocale` en `engine-core`. Sólo en adapters y hooks de renderer.

---

## 📊 Task Breakdown

| Task | Scope | Est. LOC |
|------|-------|----------|
| [13.1](tasks/01-core-types.md) | Core types: `Locale` (string), `DialogDictionary`, `LocaleDictionaries`, `I18nConfig`, `I18nState` | +120 |
| [13.2](tasks/02-i18n-port.md) | Core port: `I18nPort` + `HeadlessI18nAdapter` | +90 |
| [13.3](tasks/03-i18n-store.md) | Core state: `i18nStore` + suscripción + sync con port | +160 |
| [13.4](tasks/04-translator-helpers.md) | Core: `registerDictionary`, `translate`, `getRandomPhrase`, interpolación `{{var}}` | +180 |
| [13.5](tasks/05-commands-events.md) | Core commands + events de i18n | +60 |
| [13.6](tasks/06-core-tests.md) | Tests core: store + translator + registry + headless port | +250 |
| [13.7](tasks/07-web-i18n-adapter.md) | Platform: `webI18nAdapter` (localStorage + navigator + SSR-safe) | +140 |
| [13.8](tasks/08-r3f-hooks.md) | R3F: `useI18n` + `useLocaleDetection` + integración con `GameTouchSpriteRuntime` (sustituye DI `getPhrase`) | +170 |
| [13.9](tasks/09-locale-switcher.md) | R3F componente: `<LocaleSwitcher />` (headless + estilos default) | +110 |
| [13.10](tasks/10-nextjs-recipes.md) | Docs: 3 recetas Next.js (browser, native i18n routing, next-intl) en `docs/integrations/` | +200 docs |
| [13.11](tasks/11-demo-migration.md) | Demo: migrar `demo-content/dialogs` a `registerDictionaries`, montar switcher en inventory | +180 |
| [13.12](tasks/12-public-api-docs.md) | Public API: export desde `publicApi.ts`, actualizar `LIBRARY_API_CONTRACT_V1.md`, CHANGELOG | +120 |

**Total**: ~1780 LOC (incluye docs) | **Est. tiempo**: 5-6 horas

---

## ✅ Success Criteria

- [ ] Las 12 tareas completadas y trackeadas en `tracking.md`.
- [ ] `engine-core` no importa `navigator`, `localStorage`, `document`, `cookies`, `next/*`, `next-intl` (grep limpio).
- [ ] `Locale` pasa de union `"es" | "en"` a `string` sin romper consumo existente (alias mantenido si hace falta).
- [ ] `I18nPort`, `i18nStore`, `translate`, `getRandomPhrase`, `registerDictionary` exportados desde la API pública del engine.
- [ ] `HeadlessI18nAdapter` permite tests sin DOM ni storage.
- [ ] `webI18nAdapter` detecta `navigator.language`, persiste en `localStorage`, y es SSR-safe (no rompe en build de Next.js).
- [ ] Cambiar locale en runtime: emite evento `i18n:localeChanged`, re-renderiza todos los componentes que usan `useI18n()`.
- [ ] `<LocaleSwitcher />` montado en `InventoryUI` cambia el idioma y las frases del speech bubble pasan al nuevo locale al instante.
- [ ] Recarga manual mantiene el último locale elegido (verificación en demo).
- [ ] Backward compatibility: el `getRandomPhrase` legacy del demo sigue funcionando (delegando al translator del engine si está registrado).
- [ ] Tests pasando: ≥ 35 nuevos tests (store + translator + registry + adapter headless + interpolación).
- [ ] Recetas Next.js documentadas (3 patrones) y verificadas con snippet ejecutable.
- [ ] Demo arranca con detección automática (`navigator.language === "en-*"` → `en`; resto → `es`).

---

## 🔄 Phases Dependency Chain

```
Phase 11 (Audio System)  ✅ DONE
        ↓
Phase 12 (Architecture cleanup) — paralelo
        ↓
Phase 13 (i18n) ← THIS PHASE
        ↓
Phase 14+ (ICU plurals, fechas/números, RTL, voice-over por locale)
```

---

## 📚 Out of Scope (futuras fases)

- **ICU MessageFormat** completo (plurales con `{count, plural, ...}`, genders). Phase 14 si lo pedimos; mientras, recomendar `next-intl` para UI estática.
- **Formato de fechas/números** por locale (`Intl.DateTimeFormat`). Trivial fuera del engine.
- **RTL (right-to-left)** layout — afecta sólo a UI/CSS, no al engine.
- **Voice-over por idioma** (audio narrado de diálogos por locale) — combina Phase 11 + 13, deferred.
- **Carga lazy de diccionarios** por escena (split-loading). Default: todos al boot. Lazy en Phase 14 si los packs crecen.
- **Editor visual** de traducciones in-game.

---

## ❓ Open Questions

1. **Interpolación**: ¿implementar parser propio (`{{var}}`) o adoptar `intl-messageformat`? Recomendación: parser propio (cero deps); dejar la puerta abierta a un `Translator` pluggable en Phase 14.
2. **Pluralización**: el demo actual no usa plurales — diferir a Phase 14.
3. **Locale matching**: `navigator.language` puede ser `es-MX`, `en-GB`. ¿Hacemos negociación BCP-47 estricta o startsWith? Recomendación: helper `matchLocale(candidate, available)` que prueba exact → primary tag (`es-MX` → `es`) → `defaultLocale`.
4. **Registro de diccionarios**: ¿permitir merge incremental (varios módulos registran trozos) o sustitución total? Recomendación: merge incremental (Object.assign en el diccionario por locale).
5. **`Locale` union vs string**: ¿romper el tipo público del demo (`"es" | "en"`)? Recomendación: cambiar a `string` en core y, en el demo, mantener un alias narrowed `type DemoLocale = "es" | "en"` para autocompletado interno.

---

## 📝 Changelog

| Fecha | Acción |
|-------|--------|
| 2026-05-31 | Phase 13 planning (i18n: core + R3F + demo + Next.js recipes) |
