# Task 13.3 — Core state: i18nStore + persistencia via port

**Effort**: 45 min | **Blocks**: [13.4, 13.5, 13.8] | **Blocked by**: [13.1, 13.2]

---

## 🎯 Objetivo

Store dedicado para el estado de i18n (locale activo, disponibles, fallback). Suscripción tipo observable y método `bindPort` que conecta con un `I18nPort` para hidratar al boot y persistir en cada cambio.

---

## ✅ Success Criteria

- [ ] `createI18nStore(config: I18nConfig): I18nStore` exportada desde `engine-core/src/game/state/i18nStore.ts`.
- [ ] API mínima: `getState()`, `subscribe(listener)`, `setLocale(locale)`, `setAvailableLocales(locales)`, `setFallbackLocale(locale)`, `hydrate(state)`, `reset()`, `bindPort(port)`.
- [ ] `setLocale` valida que el locale esté en `availableLocales`; si no, hace fallback al primer disponible y emite warning en dev.
- [ ] `bindPort(port)` llama `port.detectLocale()` al inicio (si retorna locale válido lo aplica) y suscribe `persistLocale` en cada cambio.
- [ ] `bindPort` retorna unsubscribe.
- [ ] Singleton conveniente: `useI18nStore` (no hook React — alias `getI18nStore()` + `subscribeI18n()` para usos no-React).
- [ ] Re-export desde `packages/engine-core/src/game/state/index.ts`.

---

## 📝 Instructions

### Step 1 — Crear `packages/engine-core/src/game/state/i18nStore.ts`

```typescript
import type { I18nConfig, I18nState, Locale } from "../types";
import type { I18nPort } from "../../ports/i18n";

type Listener = (state: I18nState) => void;

export interface I18nStore {
  getState(): I18nState;
  subscribe(listener: Listener): () => void;
  setLocale(locale: Locale): void;
  setAvailableLocales(locales: Locale[]): void;
  setFallbackLocale(locale: Locale): void;
  hydrate(state: Partial<I18nState>): void;
  reset(): void;
  bindPort(port: I18nPort): () => void;
}

export function createI18nStore(config: I18nConfig): I18nStore {
  let state: I18nState = {
    locale: config.defaultLocale,
    availableLocales: [...config.availableLocales],
    fallbackLocale: config.fallbackLocale,
  };

  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l(state));

  const update = (patch: Partial<I18nState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const resolveSafeLocale = (next: Locale): Locale => {
    if (state.availableLocales.includes(next)) return next;
    if (typeof console !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn(`[i18nStore] locale "${next}" not in availableLocales (${state.availableLocales.join(",")}). Falling back to "${state.availableLocales[0] ?? state.fallbackLocale}".`);
    }
    return state.availableLocales[0] ?? state.fallbackLocale;
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setLocale(locale) {
      const safe = resolveSafeLocale(locale);
      if (safe === state.locale) return;
      update({ locale: safe });
    },
    setAvailableLocales(locales) {
      update({ availableLocales: [...locales] });
    },
    setFallbackLocale(locale) {
      update({ fallbackLocale: locale });
    },
    hydrate(patch) {
      state = { ...state, ...patch };
      emit();
    },
    reset() {
      state = {
        locale: config.defaultLocale,
        availableLocales: [...config.availableLocales],
        fallbackLocale: config.fallbackLocale,
      };
      emit();
    },
    bindPort(port) {
      const detected = port.detectLocale();
      if (detected) this.setLocale(detected);
      return this.subscribe((next) => port.persistLocale(next.locale));
    },
  };
}
```

### Step 2 — Singleton + helpers no-React

En el mismo archivo:

```typescript
import { DEFAULT_I18N_CONFIG } from "../types";

let _singleton: I18nStore | null = null;

export function getI18nStore(): I18nStore {
  if (!_singleton) _singleton = createI18nStore(DEFAULT_I18N_CONFIG);
  return _singleton;
}

export function resetI18nStore(config: I18nConfig = DEFAULT_I18N_CONFIG): void {
  _singleton = createI18nStore(config);
}
```

### Step 3 — Export

`packages/engine-core/src/game/state/index.ts`:

```typescript
export {
  createI18nStore,
  getI18nStore,
  resetI18nStore,
  type I18nStore,
} from "./i18nStore";
```

### Step 4 — Validación

```bash
cd packages/engine-core && npm run typecheck && npm run build
```

---

## 📚 References

- `packages/engine-core/src/game/state/audioSettingsStore.ts` — patrón análogo.
- Task 13.2 — `I18nPort`.
