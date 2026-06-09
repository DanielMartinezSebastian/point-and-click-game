# Task 06-presence-and-interest-management

**Effort**: 1.5 days | **Blocks**: 07,11 | **Blocked by**: 04

---

## 🎯 Objetivo

Hacer eficiente la presence: throttle de envío (~10–15 Hz), sharding por escena, y limpieza de
jugadores stale. Minimiza latencia/ancho de banda (requisito 3).

---

## 📁 Archivos

- **CREAR** `packages/engine-core/src/game/net/throttle.ts`
- **EDITAR** `packages/engine-core/src/game/net/MultiplayerSession.ts` (throttle de presence)
- **CREAR** `packages/engine-core/src/__tests__/presence.test.ts`

---

## ✅ Success Criteria

- [ ] `MultiplayerSession` acepta `presenceThrottleMs` (default 80 ≈ 12.5 Hz)
- [ ] Múltiples `player:moved` en una ventana → **un solo** `send` de presence (último gana, con trailing)
- [ ] El último estado siempre se envía (no se pierde el frame final del movimiento)
- [ ] `remotePlayers.getInScene(sceneId)` filtra por escena (sharding en el borde)
- [ ] El renderer puede llamar `remotePlayers.pruneStale(ms)` para limpiar desconectados
- [ ] Tests verdes

---

## 📝 Step 1 — `game/net/throttle.ts`

```ts
/**
 * Throttle con trailing: ejecuta `fn` como mucho 1 vez por `ms`, pero garantiza
 * que la ÚLTIMA llamada dentro de la ventana se ejecuta (con el estado final).
 * `schedule` permite inyectar setTimeout (tests). Sin timers reales por defecto.
 */
export function throttleTrailing(
  fn: () => void,
  ms: number,
  clock: { now: () => number; schedule: (cb: () => void, delay: number) => void },
): () => void {
  let lastRun = -Infinity;
  let scheduled = false;
  return () => {
    const t = clock.now();
    const elapsed = t - lastRun;
    if (elapsed >= ms) { lastRun = t; fn(); return; }
    if (!scheduled) {
      scheduled = true;
      clock.schedule(() => { scheduled = false; lastRun = clock.now(); fn(); }, ms - elapsed);
    }
  };
}
```

## 📝 Step 2 — Throttle de presence en `MultiplayerSession.ts`

Añade a `MultiplayerSessionOptions`:
```ts
  /** ms entre envíos de presence. Default 80 (~12.5 Hz). 0 = sin throttle. */
  presenceThrottleMs?: number;
  /** Reloj/scheduler para el throttle (inyectable en tests). */
  clock?: { now: () => number; schedule: (cb: () => void, delay: number) => void };
```

Sustituye la llamada directa `sendPresence()` por una versión throttled:
```ts
import { throttleTrailing } from "./throttle";
// ...
const clock = opts.clock ?? {
  now: () => Date.now(),
  schedule: (cb, d) => { setTimeout(cb, d); }, // platform timer; en core es aceptable vía inyección
};
const rawSendPresence = () => { self = { ...self, lastSeenTs: now() }; port.send(wrap("presence", self)); };
const sendPresence = (opts.presenceThrottleMs ?? 80) > 0
  ? throttleTrailing(rawSendPresence, opts.presenceThrottleMs ?? 80, clock)
  : rawSendPresence;
```
(El primer `sendPresence()` de anuncio al conectar puede usar `rawSendPresence()` para que sea inmediato.)

> **Sharding por escena**: el `NetEnvelope` de presence ya lleva `sceneId` dentro del
> `PlayerDescriptor`. En el MVP el filtrado vive en el consumidor (`getInScene`). En PartyKit
> (task 08) el servidor puede además NO reenviar presence entre escenas distintas para ahorrar
> ancho de banda — documéntalo, no es bloqueante para el MVP.

## 📝 Step 3 — Test `__tests__/presence.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { throttleTrailing } from "../game/net/throttle";

describe("throttleTrailing", () => {
  it("runs immediately then coalesces, flushing the last call", () => {
    let t = 0;
    const scheduled: Array<{ cb: () => void; at: number }> = [];
    const clock = { now: () => t, schedule: (cb: () => void, d: number) => scheduled.push({ cb, at: t + d }) };
    const fn = vi.fn();
    const throttled = throttleTrailing(fn, 100, clock);
    throttled();                 // t=0 → runs (1)
    t = 30; throttled();         // within window → schedules trailing
    t = 60; throttled();         // still within → already scheduled
    expect(fn).toHaveBeenCalledTimes(1);
    t = 100; scheduled.forEach((s) => s.cb()); // flush trailing
    expect(fn).toHaveBeenCalledTimes(2);        // last call flushed
  });
});
```

(El filtrado por escena ya está cubierto por el test de `remotePlayersStore` en task 03; el
throttle integrado en la sesión se valida de extremo a extremo en task 11.)

## ✅ Verificación
`npm test -w packages/engine-core` verde.

## 📚 References
- `docs/architecture/09-multiplayer.md` §5
- Nota throttle en `docs/architecture/05-bidirectional-communication.md` (`player:moved` ~60Hz)
- `packages/engine-core/src/game/net/remotePlayersStore.ts` (`getInScene`, `pruneStale`)
