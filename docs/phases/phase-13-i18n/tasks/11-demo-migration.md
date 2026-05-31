# Task 13.11 — Demo: migrar dialogs + montar switcher en inventory

**Effort**: 1h | **Blocks**: [13.12] | **Blocked by**: [13.7, 13.8, 13.9]

---

## 🎯 Objetivo

Migrar el demo (`apps/web-demo`) al nuevo sistema. Cambios mínimos para que **funcione igual que hoy** + locale dinámico + switcher visible.

---

## ✅ Success Criteria

- [ ] `apps/web-demo/demo-content/dialogs/index.ts` exporta `demoDictionaries: LocaleDictionaries` (no función pura `dialogs` raw); también `registerDemoDictionaries()` que llama `registerDictionaries(demoDictionaries)`.
- [ ] `apps/web-demo/demo-content/dialogs/getRandomPhrase.ts` queda como **wrapper de compatibilidad** que delega en el translator del engine.
- [ ] Boot del runtime (donde sea que viva `createGameRuntime` o el provider raíz) llama `registerDemoDictionaries()` + monta `useLocaleDetection({ port: webI18n, config: { defaultLocale:"es", fallbackLocale:"es", availableLocales:["es","en"] } })`.
- [ ] `<LocaleSwitcher labels={{ es:"Español", en:"English" }} />` montado en `InventoryUI` (encima de los toggles de audio).
- [ ] `GameTouchSpriteRuntime` deja de recibir `getPhrase` por DI (o lo recibe opcionalmente — el hook interno gana).
- [ ] Cambiar idioma desde el switcher cambia las frases del speech bubble (`boundaryHit`, etc.) en vivo.
- [ ] Recarga manual mantiene la elección (gracias a `webI18nAdapter`).
- [ ] Browser en `en-*` arranca en `en`; resto arranca en `es`.

---

## 📝 Instructions

### Step 1 — Refactor `demo-content/dialogs/index.ts`

Renombrar export y añadir helper:

```typescript
import { registerDictionaries, type LocaleDictionaries } from "@pointclick-engine/engine-core";

export const demoDictionaries: LocaleDictionaries = {
  es: { /* …mover todo el bloque actual… */ },
  en: { /* …idem… */ },
};

let registered = false;
export function registerDemoDictionaries() {
  if (registered) return;
  registerDictionaries(demoDictionaries);
  registered = true;
}

// Backward-compat: el viejo nombre sigue funcionando.
export const dialogs = demoDictionaries;
```

### Step 2 — `getRandomPhrase.ts` legacy → wrapper

```typescript
import { getRandomPhrase as engineGetRandomPhrase, type Locale } from "@pointclick-engine/engine-core";
import type { DialogKey } from "./types";
import { registerDemoDictionaries } from "./index";

export function getRandomPhrase(key: DialogKey, locale?: Locale): string {
  registerDemoDictionaries(); // idempotente
  return engineGetRandomPhrase(key, locale ? { locale } : undefined);
}
```

### Step 3 — Boot del engine

Localizar el bootstrap (probablemente `apps/web-demo/app/lib/engine/createGameRuntime.ts` o el provider raíz). Añadir:

```typescript
import { createWebI18nAdapter } from "@/app/lib/platform-web";
import { registerDemoDictionaries } from "@/demo-content/dialogs";

export const webI18nAdapter = createWebI18nAdapter({
  availableLocales: ["es", "en"],
});

export function bootDemoI18n() {
  registerDemoDictionaries();
}
```

En el provider raíz (client component):

```tsx
"use client";
import { useEffect } from "react";
import { useLocaleDetection } from "@pointclick-engine/engine-renderer-r3f";
import { webI18nAdapter, bootDemoI18n } from "@/app/lib/engine/i18n-boot";

export function I18nBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => { bootDemoI18n(); }, []);
  useLocaleDetection({
    port: webI18nAdapter,
    config: { defaultLocale: "es", fallbackLocale: "es", availableLocales: ["es", "en"] },
  });
  return <>{children}</>;
}
```

Montar `<I18nBoot>` en el árbol raíz (envolviendo `GameTouchCanvas`).

### Step 4 — Montar `<LocaleSwitcher />` en `InventoryUI`

En `apps/web-demo/app/components/InventoryUI.tsx` (o donde estén los toggles de audio):

```tsx
import { LocaleSwitcher } from "@pointclick-engine/engine-renderer-r3f";

// Dentro del panel, encima de los toggles de audio:
<LocaleSwitcher
  labels={{ es: "Español", en: "English" }}
  className="inventory-locale-switcher"
  ariaLabel="Idioma"
/>
```

CSS opcional en `globals.css`:

```css
.inventory-locale-switcher button { color: #fff; }
.inventory-locale-switcher button[aria-current="true"] { text-decoration: underline; }
```

### Step 5 — `GameTouchCanvas.tsx`: dejar de pasar `getPhrase`

Buscar la llamada a `GameTouchSpriteRuntime` (línea ~423 del archivo) y eliminar la prop `getPhrase={getRandomPhrase}`. El hook interno la suple.

### Step 6 — Smoke test manual

```bash
cd apps/web-demo && npm run dev
```

- Abrir la app en un navegador con `Accept-Language: en-US` → debería arrancar en inglés (frases "There's an invisible wall here…").
- Cambiar Accept-Language a `es-ES` → arrancar en español.
- Clickar el switcher de "English" / "Español" → frases del próximo boundary hit pasan al nuevo idioma sin recargar.
- Recargar (F5) → mantener el último idioma elegido.

### Step 7 — Validación

```bash
cd apps/web-demo && npm run typecheck && npm run test && npm run build
```

---

## 📚 References

- Task 13.7 — `webI18nAdapter`.
- Task 13.8 — `useLocaleDetection`.
- Task 13.9 — `LocaleSwitcher`.
- `apps/web-demo/demo-content/dialogs/` — código a migrar.
- `apps/web-demo/app/components/GameTouchCanvas.tsx:423` — uso actual de `getRandomPhrase`.
