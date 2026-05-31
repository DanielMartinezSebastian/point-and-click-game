# Task 13.7 — Platform: webI18nAdapter (localStorage + navigator + SSR-safe)

**Effort**: 45 min | **Blocks**: [13.8, 13.11] | **Blocked by**: [13.2]

---

## 🎯 Objetivo

Implementar `webI18nAdapter` (clase `WebI18nAdapter implements I18nPort`) en `apps/web-demo/app/lib/platform-web-i18n.ts`. SSR-safe (todas las ops son no-op si `typeof window === "undefined"`). Lee `navigator.language`, encaja contra `availableLocales`, persiste en `localStorage`.

---

## ✅ Success Criteria

- [ ] Clase `WebI18nAdapter` implementa `I18nPort` de `@pointclick-engine/engine-core`.
- [ ] Constructor recibe `{ availableLocales: Locale[]; storageKey?: string }` (default key `"i18n-locale"`).
- [ ] `detectLocale()`:
  - Si hay `localStorage[storageKey]` y está en `availableLocales` → devolverlo.
  - Si no, intentar `matchLocale(navigator.language, availableLocales)`.
  - Si nada matchea → `null`.
- [ ] `persistLocale(locale)` → `localStorage.setItem`.
- [ ] `clearLocale()` → `localStorage.removeItem`.
- [ ] SSR: si `typeof window === "undefined"`, `detectLocale === null`, `persistLocale` no-op, `clearLocale` no-op.
- [ ] Export singleton-friendly: `createWebI18nAdapter(opts)` factory.
- [ ] Helper `bindI18nPersistence(store, port)` que aplica `store.bindPort(port)` y retorna unsubscribe.

---

## 📝 Instructions

### Step 1 — Crear `apps/web-demo/app/lib/platform-web-i18n.ts`

```typescript
import {
  matchLocale,
  type I18nPort,
  type I18nStore,
  type Locale,
} from "@pointclick-engine/engine-core";

const DEFAULT_STORAGE_KEY = "i18n-locale";

export interface WebI18nAdapterOptions {
  availableLocales: Locale[];
  storageKey?: string;
}

export class WebI18nAdapter implements I18nPort {
  private readonly availableLocales: Locale[];
  private readonly storageKey: string;
  private readonly isBrowser = typeof window !== "undefined";

  constructor(opts: WebI18nAdapterOptions) {
    this.availableLocales = opts.availableLocales;
    this.storageKey = opts.storageKey ?? DEFAULT_STORAGE_KEY;
  }

  detectLocale(): Locale | null {
    if (!this.isBrowser) return null;

    try {
      const persisted = window.localStorage.getItem(this.storageKey);
      if (persisted && this.availableLocales.includes(persisted)) {
        return persisted;
      }
    } catch {
      /* storage disabled / quota — fall through */
    }

    const nav = window.navigator.language || (window.navigator.languages?.[0] ?? "");
    if (!nav) return null;
    return matchLocale(nav, this.availableLocales);
  }

  persistLocale(locale: Locale): void {
    if (!this.isBrowser) return;
    try {
      window.localStorage.setItem(this.storageKey, locale);
    } catch {
      /* storage disabled — silently ignore */
    }
  }

  clearLocale(): void {
    if (!this.isBrowser) return;
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      /* ignore */
    }
  }
}

export function createWebI18nAdapter(opts: WebI18nAdapterOptions): WebI18nAdapter {
  return new WebI18nAdapter(opts);
}

export function bindI18nPersistence(store: I18nStore, port: I18nPort): () => void {
  return store.bindPort(port);
}
```

### Step 2 — Re-export desde `apps/web-demo/app/lib/platform-web.ts`

```typescript
export {
  WebI18nAdapter,
  createWebI18nAdapter,
  bindI18nPersistence,
  type WebI18nAdapterOptions,
} from "./platform-web-i18n";
```

### Step 3 — Tests smoke en `apps/web-demo/app/lib/platform-web-i18n.test.ts`

Mínimos (5+ tests):

```typescript
- detectLocale en jsdom sin localStorage prev y navigator.language="es-MX" + available ["es","en"] → "es".
- detectLocale con localStorage["i18n-locale"]="en" → "en" (ignora navigator).
- persistLocale("es") → localStorage.getItem === "es".
- clearLocale() → null tras detect.
- Storage quota throw → no rompe.
```

Mock `window.localStorage` con `vi.spyOn` si hace falta.

### Step 4 — Validación

```bash
cd apps/web-demo && npm run typecheck && npm run test
```

---

## 📚 References

- Task 13.2 — `I18nPort`.
- Task 13.4 — `matchLocale`.
- `apps/web-demo/app/lib/platform-web.ts` — patrón de adapters web (audio, storage).
