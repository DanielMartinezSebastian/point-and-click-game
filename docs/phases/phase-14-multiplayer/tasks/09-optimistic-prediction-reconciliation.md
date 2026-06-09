# Task 09-optimistic-prediction-reconciliation

**Effort**: 1.5 days | **Blocks**: 11 | **Blocked by**: 05

---

## 🎯 Objetivo

Minimizar la latencia percibida: aplicar acciones world locales de inmediato (optimista) y
revertir si el servidor las rechaza (p.ej. claim de ítem perdido). Sin esto cada acción esperaría
el round-trip.

---

## 📁 Archivos

- **CREAR** `packages/engine-core/src/game/net/optimistic.ts`
- **CREAR** `packages/engine-core/src/__tests__/optimisticReconcile.test.ts`
- **EDITAR** `game/net/index.ts`
- **EDITAR** `game/net/MultiplayerSession.ts` (manejar `claim-result` y `snapshot`)

---

## ✅ Success Criteria

- [ ] `createOptimisticReconciler()` con `track/confirm/reject/onSnapshot/size`
- [ ] Acción confirmada → no se revierte. Acción rechazada → se llama su `rollback`
- [ ] `onSnapshot` revierte todas las predicciones no confirmadas (reconexión)
- [ ] La sesión enruta `claim-result {granted:false}` → `reject(entityId)`
- [ ] Tests verdes

---

## 📝 Step 1 — `game/net/optimistic.ts`

```ts
export interface PendingAction { entityId: string; rollback: () => void; }

/**
 * Buffer de acciones optimistas pendientes de confirmación. Cada acción aporta
 * su propio `rollback` (cómo deshacerla). Reconciliación determinista.
 */
export function createOptimisticReconciler() {
  const pending = new Map<string, PendingAction>();
  return {
    /** Registra una predicción local ya aplicada. */
    track(entityId: string, rollback: () => void): void {
      pending.set(entityId, { entityId, rollback });
    },
    /** El servidor confirmó: descarta la predicción (no revierte). */
    confirm(entityId: string): void { pending.delete(entityId); },
    /** El servidor rechazó: revierte y descarta. */
    reject(entityId: string): void {
      const p = pending.get(entityId);
      if (p) { p.rollback(); pending.delete(entityId); }
    },
    /** Reconexión: revierte TODO lo no confirmado antes de aplicar el snapshot. */
    onSnapshot(): void { pending.forEach((p) => p.rollback()); pending.clear(); },
    size(): number { return pending.size; },
  };
}

export type OptimisticReconciler = ReturnType<typeof createOptimisticReconciler>;
```

## 📝 Step 2 — Uso en `MultiplayerSession.ts`

1. Acepta `reconciler?: OptimisticReconciler` en las opciones.
2. Cuando el host hace pickup local (claim), llama `reconciler.track(itemId, () => devolverItemAlWorld())` y envía `kind: "claim"`.
3. En `port.onMessage`, enruta:
```ts
   else if (m.kind === "claim-result") {
     const r = m.payload as { entityId: string; granted: boolean };
     if (r.granted) reconciler?.confirm(r.entityId);
     else reconciler?.reject(r.entityId);   // ⟵ rollback: ítem vuelve al world
   } else if (m.kind === "snapshot") {
     reconciler?.onSnapshot();
     applyRemoteEvent({ type: "net:status", status: { state: "connected", selfId: self.playerId } } as any);
     // El host aplica el snapshot del world (LWW) — ver task 10/11.
   }
```

> El `rollback` concreto del pickup (devolver el ítem a `placedItems` y quitarlo del inventario)
> lo aporta el host al llamar `track(...)`. El core solo orquesta confirm/reject.

## 📝 Step 3 — Test `__tests__/optimisticReconcile.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { createOptimisticReconciler } from "../game/net/optimistic";

describe("optimistic reconciler", () => {
  it("confirm does not roll back", () => {
    const r = createOptimisticReconciler();
    const rollback = vi.fn();
    r.track("key", rollback);
    r.confirm("key");
    expect(rollback).not.toHaveBeenCalled();
    expect(r.size()).toBe(0);
  });
  it("reject rolls back exactly once", () => {
    const r = createOptimisticReconciler();
    const rollback = vi.fn();
    r.track("key", rollback);
    r.reject("key");
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(r.size()).toBe(0);
  });
  it("onSnapshot reverts all unconfirmed predictions", () => {
    const r = createOptimisticReconciler();
    const a = vi.fn(); const b = vi.fn();
    r.track("k1", a); r.track("k2", b);
    r.onSnapshot();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(r.size()).toBe(0);
  });
});
```

## ✅ Verificación
`npm test -w packages/engine-core` verde.

## 📚 References
- task 05 (claim protocol + HLC + LWW)
- `docs/architecture/09-multiplayer.md` §4–§5
- `packages/engine-core/src/game/state/placedItemsStore.ts` (estado a revertir)
