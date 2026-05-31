# Task 13.1 — Core types: Locale, DialogDictionary, I18nConfig

**Effort**: 30 min | **Blocks**: [13.2, 13.3, 13.4] | **Blocked by**: —

---

## 🎯 Objetivo

Introducir los tipos base del sistema i18n en `engine-core`. Sustituyen al union `Locale = "es" | "en"` que vive hoy en `apps/web-demo/demo-content/dialogs/types.ts`.

---

## ✅ Success Criteria

- [ ] `Locale = string` (no union — cualquier código BCP-47 vale).
- [ ] `DialogKey`, `DialogEntry`, `DialogDictionary`, `LocaleDictionaries` exportados desde `engine-core`.
- [ ] `I18nConfig` (defaultLocale, fallbackLocale, availableLocales) y `I18nState` exportados.
- [ ] Constantes `DEFAULT_I18N_CONFIG` con valores neutros: `defaultLocale: "en"`, `fallbackLocale: "en"`, `availableLocales: ["en"]`.
- [ ] Sin breaking en demo: `apps/web-demo/demo-content/dialogs/types.ts` queda como re-export con alias narrowed (`type DemoLocale = "es" | "en"`).

---

## 📝 Instructions

### Step 1 — Crear `packages/engine-core/src/game/types/i18n.ts`

```typescript
export type Locale = string;

export type DialogKey = string;

export interface DialogEntry {
  /** Una o varias frases. Si hay >1 se elige una aleatoria. */
  phrases: string[];
}

export type DialogDictionary = Record<DialogKey, DialogEntry>;

export type LocaleDictionaries = Record<Locale, DialogDictionary>;

export interface I18nConfig {
  defaultLocale: Locale;
  fallbackLocale: Locale;
  availableLocales: Locale[];
}

export interface I18nState {
  locale: Locale;
  availableLocales: Locale[];
  fallbackLocale: Locale;
}

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  defaultLocale: "en",
  fallbackLocale: "en",
  availableLocales: ["en"],
};
```

### Step 2 — Re-exportar desde `packages/engine-core/src/game/types/index.ts`

Añadir `export * from "./i18n";` al barrel.

### Step 3 — Adaptar el demo

En `apps/web-demo/demo-content/dialogs/types.ts`:

```typescript
import type { Locale as EngineLocale, DialogEntry, DialogDictionary, LocaleDictionaries } from "@pointclick-engine/engine-core";

/** Narrowed alias para autocompletado interno del demo. */
export type DemoLocale = "es" | "en";

export type Locale = EngineLocale;
export type { DialogEntry, DialogDictionary };
export type DialogLocales = LocaleDictionaries;
export type DialogKey = string;
```

### Step 4 — Validación

```bash
cd packages/engine-core && npm run typecheck
cd ../../apps/web-demo && npm run typecheck
```

Grep de control:

```bash
grep -rE "Locale\s*=\s*\"es\"\s*\|\s*\"en\"" packages/engine-core/src/  # vacío esperado
```

---

## 📚 References

- `apps/web-demo/demo-content/dialogs/types.ts` — origen actual.
- `packages/engine-core/src/game/types/index.ts` — barrel a actualizar.
- Phase 11 `tasks/01-core-types.md` — patrón idéntico (audio types).
