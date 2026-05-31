# Task 13.12 — Public API: exports, contrato v1, CHANGELOG

**Effort**: 30 min | **Blocks**: — | **Blocked by**: [13.1, 13.3, 13.4, 13.8, 13.9, 13.10, 13.11]

---

## 🎯 Objetivo

Cerrar la fase: exponer la nueva API por la frontera pública (`publicApi.ts`), actualizar el contrato v1, registrar la entrada de CHANGELOG y bump de versión a `v0.4.0`.

---

## ✅ Success Criteria

- [ ] `apps/web-demo/app/lib/engine/publicApi.ts` exporta:
  - Tipos: `Locale`, `DialogKey`, `DialogEntry`, `DialogDictionary`, `LocaleDictionaries`, `I18nConfig`, `I18nState`, `I18nPort`.
  - Funciones: `registerDictionary`, `registerDictionaries`, `getDictionary`, `translate`, `getRandomPhrase`, `matchLocale`, `getI18nStore`, `createI18nStore`.
  - Hooks/componentes (vía re-export del renderer): `useI18n`, `useLocaleDetection`, `I18nProvider`, `LocaleSwitcher`.
- [ ] `docs/architecture/02-public-api.md` actualizado con la nueva sección "i18n".
- [ ] `LIBRARY_API_CONTRACT_V1.md` (si existe) incluye los nuevos exports — marcar como **additions only**, no breaking.
- [ ] `CHANGELOG.md` entrada nueva para `v0.4.0` con el resumen de la fase.
- [ ] `packages/engine-core/package.json` y `packages/engine-renderer-r3f/package.json` → bump a `0.4.0`.
- [ ] `packages/engine-core/src/index.ts` VERSION constant → `"0.4.0"`.
- [ ] `tracking.md` de la fase: marcar todo `[x]` + completar fecha en la cabecera + post-phase checklist verde.
- [ ] Git tag opcional: `v0.4.0`.

---

## 📝 Instructions

### Step 1 — Editar `publicApi.ts`

Añadir bloques de re-export:

```typescript
// i18n (Phase 13)
export type {
  Locale,
  DialogKey,
  DialogEntry,
  DialogDictionary,
  LocaleDictionaries,
  I18nConfig,
  I18nState,
  I18nPort,
  I18nStore,
} from "@pointclick-engine/engine-core";

export {
  registerDictionary,
  registerDictionaries,
  getDictionary,
  translate,
  getRandomPhrase,
  matchLocale,
  getI18nStore,
  createI18nStore,
  resetI18nStore,
} from "@pointclick-engine/engine-core";

export {
  useI18n,
  useLocaleDetection,
  I18nProvider,
  LocaleSwitcher,
  type UseI18nResult,
  type UseLocaleDetectionOptions,
  type LocaleSwitcherProps,
  type LocaleSwitcherRenderOption,
} from "@pointclick-engine/engine-renderer-r3f";
```

### Step 2 — Editar `docs/architecture/02-public-api.md`

Añadir bajo "Tipos":

```markdown
### i18n (v0.4.0+)
Locale, DialogKey, DialogEntry, DialogDictionary, LocaleDictionaries, I18nConfig, I18nState, I18nPort, I18nStore
```

Y bajo "Funciones / Componentes":

```markdown
registerDictionary, registerDictionaries, getDictionary
translate, getRandomPhrase, matchLocale
getI18nStore, createI18nStore, resetI18nStore
useI18n, useLocaleDetection
I18nProvider, LocaleSwitcher
```

### Step 3 — `CHANGELOG.md`

```markdown
## v0.4.0 — 2026-XX-XX

### Added — i18n / Localization System

- New i18n core in `engine-core`: `I18nPort`, `i18nStore`, dictionary registry, translator (`translate`, `getRandomPhrase`) with `{{var}}` interpolation and `matchLocale` BCP-47 helper.
- New R3F hooks/components: `useI18n`, `useLocaleDetection`, `I18nProvider`, `LocaleSwitcher`.
- New platform adapter: `WebI18nAdapter` (localStorage + navigator.language, SSR-safe).
- New commands: `i18n:setLocale`, `i18n:registerDictionary`.
- New events: `i18n:localeChanged`, `i18n:dictionaryUpdated`.
- Docs: `docs/integrations/nextjs-i18n.md` — 3 recipes (browser auto, native Next.js i18n routing, next-intl).

### Changed

- `Locale` is now `string` instead of the union `"es" | "en"` (backward compatible — demo keeps a narrowed `DemoLocale` alias).
- `GameTouchSpriteRuntime` no longer requires the `getPhrase` DI prop. It still accepts it as an override (backward compatible); when omitted, the component uses the i18n store.
- Demo dialogs migrated from raw object export to `registerDemoDictionaries()`. `getRandomPhrase` in `demo-content` is now a thin wrapper over the engine translator.

### Removed

- Nothing (no breaking changes).

### Migration guide

Existing consumers do not need to change anything to keep working. To opt into the new system:

1. Call `registerDictionaries(yourDictionaries)` at app boot.
2. Mount `useLocaleDetection({ port: createWebI18nAdapter({ availableLocales }) })` once.
3. Drop the `getPhrase` DI from `GameTouchSpriteRuntime`.
4. Mount `<LocaleSwitcher />` wherever you want the language toggle.
```

### Step 4 — Bumps de versión

```bash
# Actualizar manualmente en cada package.json:
# - packages/engine-core/package.json    "version": "0.4.0"
# - packages/engine-renderer-r3f/package.json   "version": "0.4.0"
# - packages/engine-core/src/index.ts: export const VERSION = "0.4.0";
```

### Step 5 — Cerrar tracking

En `docs/phases/phase-13-i18n/tracking.md`:

- Marcar todos los `[x]` en Sprint 1/2/3.
- Marcar todos los items del "Post-Phase Checklist".
- Cabecera: `Status: Completed` + `Completed: 2026-XX-XX`.

### Step 6 — Tag opcional

```bash
git tag v0.4.0 -m "Phase 13 — i18n / Localization System"
git push origin v0.4.0
```

### Step 7 — Validación final

```bash
npm run typecheck --workspaces
npm run test --workspaces
npm run build --workspaces
```

Grep finales:

```bash
grep -rE "navigator\.|localStorage|document\." packages/engine-core/src/      # vacío
grep -rE "navigator\.|localStorage|document\." packages/engine-renderer-r3f/src/  # vacío
```

---

## 📚 References

- `docs/architecture/02-public-api.md` — contrato.
- `CHANGELOG.md` — formato existente.
- Phase 11 task 11.10 — patrón de cierre análogo.
