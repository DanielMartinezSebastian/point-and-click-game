# Task 13.5 — Core commands + events de i18n

**Effort**: 30 min | **Blocks**: [13.6, 13.8] | **Blocked by**: [13.3, 13.4]

---

## 🎯 Objetivo

Integrar i18n al bus bidireccional de commands/events del runtime (Phase 4). El host externo (UI/Next.js) podrá:

- Disparar `executeCommand({ type: "i18n:setLocale", locale: "en" })`.
- Suscribirse a `runtime.on("i18n:localeChanged", h)` para reaccionar.

---

## ✅ Success Criteria

- [ ] Añadidos al union `GameCommand`: `"i18n:setLocale"`, `"i18n:registerDictionary"`.
- [ ] Añadidos al union `GameEvent`: `"i18n:localeChanged"`, `"i18n:dictionaryUpdated"`.
- [ ] Handler en `CommandHandler` (o equivalente) que ejecuta `i18nStore.setLocale` / `registerDictionary` y emite el evento.
- [ ] `i18nStore.subscribe` enlazado al `EventBus` global de modo que `setLocale` directo en el store también emite `i18n:localeChanged`.
- [ ] Sin doble emisión: el handler de command NO duplica el evento (deja que el store sea la única fuente).
- [ ] Exports actualizados en `publicApi.ts` (se hará en task 13.12, aquí solo el core).

---

## 📝 Instructions

### Step 1 — Añadir tipos en `packages/engine-core/src/game/commands/types.ts`

```typescript
export type GameCommand =
  | /* ...existing... */
  | { type: "i18n:setLocale"; locale: Locale }
  | { type: "i18n:registerDictionary"; locale: Locale; dict: DialogDictionary };
```

### Step 2 — Añadir tipos en `packages/engine-core/src/game/events/types.ts`

```typescript
export type GameEvent =
  | /* ...existing... */
  | { type: "i18n:localeChanged"; locale: Locale; previous: Locale }
  | { type: "i18n:dictionaryUpdated"; locale: Locale; keysAdded: number };
```

### Step 3 — Handler en `CommandHandler`

Buscar el switch principal (`packages/engine-core/src/game/commands/handler.ts` o equivalente) y añadir:

```typescript
case "i18n:setLocale": {
  const store = getI18nStore();
  store.setLocale(cmd.locale);
  // store emit ya dispara i18n:localeChanged via setupI18nBridge — no emitir aquí.
  return;
}
case "i18n:registerDictionary": {
  const before = Object.keys(getDictionary(cmd.locale) ?? {}).length;
  registerDictionary(cmd.locale, cmd.dict);
  const after = Object.keys(getDictionary(cmd.locale) ?? {}).length;
  bus.emit({ type: "i18n:dictionaryUpdated", locale: cmd.locale, keysAdded: after - before });
  return;
}
```

### Step 4 — Bridge store → event bus

Crear `packages/engine-core/src/game/i18n/bridge.ts`:

```typescript
import type { EventBus } from "../events/bus";
import { getI18nStore } from "../state/i18nStore";

let unsubscribe: (() => void) | null = null;
let lastLocale: string | null = null;

export function setupI18nBridge(bus: EventBus): () => void {
  unsubscribe?.();
  const store = getI18nStore();
  lastLocale = store.getState().locale;
  unsubscribe = store.subscribe((state) => {
    if (state.locale === lastLocale) return;
    bus.emit({ type: "i18n:localeChanged", locale: state.locale, previous: lastLocale ?? state.locale });
    lastLocale = state.locale;
  });
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}
```

Llamar `setupI18nBridge(bus)` desde `createGameRuntime` al inicializar.

### Step 5 — Validación

```bash
cd packages/engine-core && npm run typecheck && npm run build
```

---

## 📚 References

- `packages/engine-core/src/game/commands/` y `events/` — uniones actuales.
- `docs/architecture/05-bidirectional-communication.md` — patrón command/event.
- Phase 4 — bridge audio análogo si existe.
