# Task 13.2 — Core port: I18nPort + HeadlessI18nAdapter

**Effort**: 30 min | **Blocks**: [13.3, 13.7] | **Blocked by**: [13.1]

---

## 🎯 Objetivo

Definir el puerto `I18nPort` (interfaz que adapters externos deben implementar) y un `HeadlessI18nAdapter` para tests. Es el mismo patrón que `AudioPort` / `StoragePort`.

---

## ✅ Success Criteria

- [ ] `I18nPort` definido en `packages/engine-core/src/ports/i18n.ts`.
- [ ] `detectLocale(): Locale | null` (detección inicial al boot).
- [ ] `persistLocale(locale: Locale): void` (persistencia tras `setLocale`).
- [ ] `clearLocale?(): void` (opcional — para logout / reset).
- [ ] `HeadlessI18nAdapter` clase con valor configurable y grabación de llamadas (`calls: Array<{ kind, locale? }>`).
- [ ] Exports añadidos al barrel `packages/engine-core/src/ports/index.ts`.

---

## 📝 Instructions

### Step 1 — Crear `packages/engine-core/src/ports/i18n.ts`

```typescript
import type { Locale } from "../game/types";

export interface I18nPort {
  /** Locale a usar al boot. Retorna `null` si no hay preferencia detectable. */
  detectLocale(): Locale | null;
  /** Guarda el locale elegido por el usuario para futuras sesiones. */
  persistLocale(locale: Locale): void;
  /** Limpia cualquier persistencia. Útil en logout o reset de settings. */
  clearLocale?(): void;
}
```

### Step 2 — Crear `packages/engine-core/src/ports/headlessI18n.ts`

```typescript
import type { Locale } from "../game/types";
import type { I18nPort } from "./i18n";

export type HeadlessI18nCall =
  | { kind: "detect" }
  | { kind: "persist"; locale: Locale }
  | { kind: "clear" };

export class HeadlessI18nAdapter implements I18nPort {
  readonly calls: HeadlessI18nCall[] = [];
  private stored: Locale | null;

  constructor(initial: Locale | null = null) {
    this.stored = initial;
  }

  detectLocale(): Locale | null {
    this.calls.push({ kind: "detect" });
    return this.stored;
  }

  persistLocale(locale: Locale): void {
    this.calls.push({ kind: "persist", locale });
    this.stored = locale;
  }

  clearLocale(): void {
    this.calls.push({ kind: "clear" });
    this.stored = null;
  }

  /** Helper de test: reset sin grabar. */
  reset(initial: Locale | null = null): void {
    this.calls.length = 0;
    this.stored = initial;
  }
}
```

### Step 3 — Exportar desde `packages/engine-core/src/ports/index.ts`

```typescript
export type { I18nPort } from "./i18n";
export { HeadlessI18nAdapter, type HeadlessI18nCall } from "./headlessI18n";
```

### Step 4 — Validación

```bash
cd packages/engine-core && npm run typecheck && npm run build
```

---

## 📚 References

- `packages/engine-core/src/ports/audio.ts` — patrón análogo (`AudioPort`).
- `packages/engine-core/src/ports/headlessAudio.ts` — patrón del headless adapter.
- Task 13.1 — tipos `Locale` requeridos.
