# Task 13.8 — R3F: useI18n + useLocaleDetection + integración runtime

**Effort**: 1h | **Blocks**: [13.9, 13.11] | **Blocked by**: [13.3, 13.4, 13.5, 13.7]

---

## 🎯 Objetivo

Exponer hooks React desde `engine-renderer-r3f` para consumir el sistema i18n. Refactorizar `GameTouchSpriteRuntime` para que use `useI18n` internamente en vez de la DI prop `getPhrase` (manteniendo la prop como override opcional para tests).

---

## ✅ Success Criteria

- [ ] `useI18n()` retorna `{ locale, setLocale, t, getPhrase, availableLocales }` y re-renderiza al cambiar.
- [ ] `useLocaleDetection({ port, config? })` se monta una vez y llama `store.bindPort(port)`; retorna unsubscribe en cleanup.
- [ ] `<I18nProvider config={{ defaultLocale, fallbackLocale, availableLocales }}>` opcional — resetea el singleton al montar (útil para tests y para clientes que no quieren tocar el store directamente).
- [ ] `GameTouchSpriteRuntime`: la prop `getPhrase` pasa a `getPhrase?` (opcional). Si no se pasa, el componente usa `useI18n().getPhrase`. Si se pasa, prevalece (backward compat).
- [ ] Re-export desde `packages/engine-renderer-r3f/src/index.ts`.
- [ ] Sin importar `navigator`, `localStorage`, `document` en el código del package.

---

## 📝 Instructions

### Step 1 — Hook principal `packages/engine-renderer-r3f/src/hooks/useI18n.ts`

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getI18nStore,
  translate,
  getRandomPhrase,
  type Locale,
  type TranslateOptions,
  type GetRandomPhraseOptions,
} from "@pointclick-engine/engine-core";

export interface UseI18nResult {
  locale: Locale;
  availableLocales: Locale[];
  setLocale: (locale: Locale) => void;
  t: (key: string, opts?: TranslateOptions) => string;
  getPhrase: (key: string, opts?: GetRandomPhraseOptions) => string;
}

export function useI18n(): UseI18nResult {
  const store = getI18nStore();
  const [state, setState] = useState(store.getState());

  useEffect(() => store.subscribe(setState), [store]);

  const setLocale = useCallback((locale: Locale) => store.setLocale(locale), [store]);
  const t = useCallback((key: string, opts?: TranslateOptions) => translate(key, opts), []);
  const getPhrase = useCallback(
    (key: string, opts?: GetRandomPhraseOptions) => getRandomPhrase(key, opts),
    [],
  );

  return {
    locale: state.locale,
    availableLocales: state.availableLocales,
    setLocale,
    t,
    getPhrase,
  };
}
```

### Step 2 — Hook de detección `packages/engine-renderer-r3f/src/hooks/useLocaleDetection.ts`

```typescript
"use client";

import { useEffect } from "react";
import { getI18nStore, type I18nPort, type I18nConfig } from "@pointclick-engine/engine-core";

export interface UseLocaleDetectionOptions {
  port: I18nPort;
  config?: Partial<I18nConfig>;
}

export function useLocaleDetection({ port, config }: UseLocaleDetectionOptions): void {
  useEffect(() => {
    const store = getI18nStore();
    if (config?.availableLocales) store.setAvailableLocales(config.availableLocales);
    if (config?.fallbackLocale) store.setFallbackLocale(config.fallbackLocale);
    const unsubscribe = store.bindPort(port);
    return unsubscribe;
  }, [port, config]);
}
```

### Step 3 — Provider opcional `packages/engine-renderer-r3f/src/components/I18nProvider.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { resetI18nStore, type I18nConfig } from "@pointclick-engine/engine-core";

export function I18nProvider({ config, children }: { config: I18nConfig; children: React.ReactNode }) {
  useEffect(() => { resetI18nStore(config); }, [config]);
  return children as React.ReactElement;
}
```

### Step 4 — Refactor `GameTouchSpriteRuntime.tsx`

En el archivo `packages/engine-renderer-r3f/src/GameTouchSpriteRuntime.tsx`:

```typescript
// 1) importar
import { useI18n } from "./hooks/useI18n";

// 2) hacer la prop opcional
getPhrase?: (key: string) => string;

// 3) dentro del componente
const { getPhrase: i18nGetPhrase } = useI18n();
const resolvePhrase = getPhrase ?? i18nGetPhrase;

// 4) sustituir todos los usos de `getPhrase(...)` por `resolvePhrase(...)`
```

### Step 5 — Exports

`packages/engine-renderer-r3f/src/index.ts`:

```typescript
export { useI18n, type UseI18nResult } from "./hooks/useI18n";
export { useLocaleDetection, type UseLocaleDetectionOptions } from "./hooks/useLocaleDetection";
export { I18nProvider } from "./components/I18nProvider";
```

### Step 6 — Tests

`packages/engine-renderer-r3f/src/__tests__/useI18n.test.tsx` con `@testing-library/react`:

- `useI18n()` retorna locale inicial.
- `setLocale("en")` re-renderiza con `locale === "en"`.
- `t("missing.key")` retorna la key.
- `getPhrase("k", { random: () => 0 })` retorna primer item.

### Step 7 — Validación

```bash
cd packages/engine-renderer-r3f && npm run typecheck && npm run test && npm run build
grep -rE "navigator\.|localStorage|document\." packages/engine-renderer-r3f/src/ # vacío esperado
```

---

## 📚 References

- Task 13.3 — `getI18nStore`, `bindPort`.
- Task 13.4 — `translate`, `getRandomPhrase`.
- Task 13.7 — `WebI18nAdapter` (a inyectar en `useLocaleDetection`).
- `packages/engine-renderer-r3f/src/GameTouchSpriteRuntime.tsx` — código a refactorizar.
