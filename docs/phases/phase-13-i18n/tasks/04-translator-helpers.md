# Task 13.4 — Core: registerDictionary + translate + getRandomPhrase + interpolación

**Effort**: 1h | **Blocks**: [13.6, 13.8] | **Blocked by**: [13.1, 13.3]

---

## 🎯 Objetivo

Registro de diccionarios y funciones puras de traducción. Funciones agnósticas (no React, no `window`). Soporta interpolación `{{var}}` y fallback chain (locale activo → fallbackLocale → key cruda).

---

## ✅ Success Criteria

- [ ] `registerDictionary(locale, dict)` y `registerDictionaries(dicts)` exportadas desde `engine-core/src/game/i18n/registry.ts`.
- [ ] Merge incremental: llamar dos veces con el mismo locale **suma** claves (Object.assign), no sustituye el diccionario entero. Si una clave colisiona, la segunda gana y se emite warning en dev.
- [ ] `getDictionary(locale): DialogDictionary | undefined`.
- [ ] `translate(key, opts?): string` con fallback chain.
- [ ] `getRandomPhrase(key): string` con fallback chain.
- [ ] Interpolación simple `{{var}}`: reemplazo de `{{name}}` por `opts.vars.name` (todas las ocurrencias). Si `vars` no se pasa, se devuelve el string tal cual (no toca llaves).
- [ ] `matchLocale(candidate, available): Locale | null` — exact → primary tag (`es-MX` → `es`) → null.
- [ ] Random determinista en tests: aceptar `random: () => number` inyectable en `getRandomPhrase` (default `Math.random`).
- [ ] Re-export desde `packages/engine-core/src/index.ts`.

---

## 📝 Instructions

### Step 1 — Crear `packages/engine-core/src/game/i18n/registry.ts`

```typescript
import type { DialogDictionary, DialogKey, Locale, LocaleDictionaries } from "../types";

const registry = new Map<Locale, DialogDictionary>();

export function registerDictionary(locale: Locale, dict: DialogDictionary): void {
  const existing = registry.get(locale);
  if (!existing) {
    registry.set(locale, { ...dict });
    return;
  }
  for (const key of Object.keys(dict)) {
    if (existing[key] && process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] overwriting key "${key}" in locale "${locale}"`);
    }
  }
  registry.set(locale, { ...existing, ...dict });
}

export function registerDictionaries(all: LocaleDictionaries): void {
  for (const locale of Object.keys(all)) {
    registerDictionary(locale, all[locale]!);
  }
}

export function getDictionary(locale: Locale): DialogDictionary | undefined {
  return registry.get(locale);
}

export function clearRegistry(): void {
  registry.clear();
}
```

### Step 2 — Crear `packages/engine-core/src/game/i18n/translator.ts`

```typescript
import type { DialogKey, Locale } from "../types";
import { getI18nStore } from "../state/i18nStore";
import { getDictionary } from "./registry";

export interface TranslateOptions {
  vars?: Record<string, string | number>;
  /** Override de locale; útil para emails / SSR. Default: store.getState().locale */
  locale?: Locale;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v !== undefined ? String(v) : `{{${name}}}`;
  });
}

function lookup(key: DialogKey, locale: Locale): string | undefined {
  const dict = getDictionary(locale);
  const entry = dict?.[key];
  return entry?.phrases[0];
}

export function translate(key: DialogKey, opts: TranslateOptions = {}): string {
  const { locale, fallbackLocale } = getI18nStore().getState();
  const active = opts.locale ?? locale;
  const raw =
    lookup(key, active) ??
    lookup(key, fallbackLocale) ??
    key;
  return interpolate(raw, opts.vars);
}

export interface GetRandomPhraseOptions {
  vars?: Record<string, string | number>;
  locale?: Locale;
  random?: () => number;
}

export function getRandomPhrase(key: DialogKey, opts: GetRandomPhraseOptions = {}): string {
  const { locale, fallbackLocale } = getI18nStore().getState();
  const active = opts.locale ?? locale;
  const rng = opts.random ?? Math.random;

  const dict = getDictionary(active) ?? getDictionary(fallbackLocale);
  const entry = dict?.[key];
  if (!entry || entry.phrases.length === 0) return key;

  const idx = Math.floor(rng() * entry.phrases.length);
  return interpolate(entry.phrases[idx]!, opts.vars);
}

export function matchLocale(candidate: string, available: Locale[]): Locale | null {
  if (available.includes(candidate)) return candidate;
  const primary = candidate.split("-")[0]!;
  if (available.includes(primary)) return primary;
  return null;
}
```

### Step 3 — Barrel `packages/engine-core/src/game/i18n/index.ts`

```typescript
export * from "./registry";
export * from "./translator";
```

### Step 4 — Re-export desde root

`packages/engine-core/src/index.ts`:

```typescript
export * from "./game/i18n";
```

### Step 5 — Validación

```bash
cd packages/engine-core && npm run typecheck && npm run build
```

---

## 📚 References

- `apps/web-demo/demo-content/dialogs/getRandomPhrase.ts` — implementación origen.
- Task 13.1 — tipos.
- Task 13.3 — `getI18nStore`.
