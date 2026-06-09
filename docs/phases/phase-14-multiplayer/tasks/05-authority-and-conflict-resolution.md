# Task 05-authority-and-conflict-resolution

**Effort**: 2 days | **Blocks**: 09 | **Blocked by**: 04

---

## 🎯 Objetivo

Resolver conflictos del estado `world` de forma determinista: reloj lógico (HLC), mapa
last-write-wins (LWW), y protocolo de **claim** para que dos jugadores no recojan el mismo ítem.
Camino por defecto: **PartyKit server-authoritative** (el servidor decide). Aquí se implementa la
lógica pura, reutilizable tanto en el server como en modo CRDT-lite.

---

## 📁 Archivos

- **CREAR** `packages/engine-core/src/game/net/clock.ts`
- **CREAR** `packages/engine-core/src/game/net/worldState.ts`
- **CREAR** `packages/engine-core/src/game/net/claims.ts`
- **CREAR** `packages/engine-core/src/__tests__/worldStateLww.test.ts`
- **CREAR** `packages/engine-core/src/__tests__/itemClaim.test.ts`
- **EDITAR** `game/net/index.ts`

---

## ✅ Success Criteria

- [ ] `Hlc` produce timestamps monótonos y comparables como número
- [ ] `WorldStateLww.merge` aplica el valor con mayor `ts` (desempate por `by`)
- [ ] `resolveClaim` da exactamente **un** ganador ante claims concurrentes
- [ ] El perdedor obtiene un resultado `granted:false` (→ rollback en task 09)
- [ ] Tests verdes

---

## 📝 Step 1 — `game/net/clock.ts` (Hybrid Logical Clock)

```ts
/** HLC: combina reloj físico y contador lógico → orden total sin sincronizar relojes. */
const COUNTER_BITS = 12;            // hasta 4096 eventos por ms
const COUNTER_MASK = (1 << COUNTER_BITS) - 1;

export class Hlc {
  private lastPhysical = 0;
  private counter = 0;

  /** Devuelve un timestamp codificado (number) monótono creciente. */
  now(wall: number = Date.now()): number {
    if (wall > this.lastPhysical) { this.lastPhysical = wall; this.counter = 0; }
    else { this.counter = (this.counter + 1) & COUNTER_MASK; }
    return this.lastPhysical * (COUNTER_MASK + 1) + this.counter;
  }

  /** Actualiza el reloj al recibir un ts remoto (mantiene la causalidad). */
  update(remoteTs: number, wall: number = Date.now()): number {
    const remotePhysical = Math.floor(remoteTs / (COUNTER_MASK + 1));
    this.lastPhysical = Math.max(this.lastPhysical, remotePhysical, wall);
    this.counter = (this.counter + 1) & COUNTER_MASK;
    return this.lastPhysical * (COUNTER_MASK + 1) + this.counter;
  }
}
```

## 📝 Step 2 — `game/net/worldState.ts` (LWW register map)

```ts
import type { PlayerId } from "./playerIdentity";

export interface LwwRegister<V = unknown> { value: V; ts: number; by: PlayerId; }

/** Mapa de registros LWW por `${entityId}:${field}`. Determinista entre clientes. */
export class WorldStateLww {
  private map = new Map<string, LwwRegister>();
  private key = (entityId: string, field: string) => `${entityId}:${field}`;

  get<V>(entityId: string, field: string): V | undefined {
    return this.map.get(this.key(entityId, field))?.value as V | undefined;
  }

  /** Aplica un registro remoto/local. Devuelve true si ganó (cambió el estado). */
  merge(entityId: string, field: string, reg: LwwRegister): boolean {
    const k = this.key(entityId, field);
    const cur = this.map.get(k);
    // Gana mayor ts; empate → mayor playerId (criterio estable arbitrario).
    if (!cur || reg.ts > cur.ts || (reg.ts === cur.ts && reg.by > cur.by)) {
      this.map.set(k, reg);
      return true;
    }
    return false;
  }

  snapshot(): Record<string, LwwRegister> { return Object.fromEntries(this.map); }
  load(snap: Record<string, LwwRegister>): void {
    this.map = new Map(Object.entries(snap));
  }
}
```

## 📝 Step 3 — `game/net/claims.ts` (protocolo de claim)

```ts
import type { PlayerId } from "./playerIdentity";

export interface ItemClaim { entityId: string; by: PlayerId; ts: number; }
export interface ClaimResult { entityId: string; by: PlayerId; granted: boolean; }

/**
 * Resuelve un conjunto de claims sobre el MISMO entityId (orden de llegada irrelevante).
 * Gana el de menor ts (first-writer-wins); empate → menor playerId. Determinista.
 */
export function resolveClaim(claims: ItemClaim[]): ClaimResult[] {
  if (claims.length === 0) return [];
  const winner = [...claims].sort(
    (a, b) => a.ts - b.ts || (a.by < b.by ? -1 : 1),
  )[0]!;
  return claims.map((c) => ({
    entityId: c.entityId, by: c.by, granted: c.by === winner.by,
  }));
}
```

> **Integración** (server-authoritative, PartyKit task 08): el servidor recolecta claims por
> `entityId` dentro de una ventana corta (p.ej. 1 tick) y difunde `resolveClaim(...)` como
> envelopes `claim-result`. En modo CRDT-lite, cada cliente ejecuta `resolveClaim` sobre los
> claims que ve; al ser determinista todos llegan al mismo ganador.

## 📝 Step 4 — Tests

`__tests__/worldStateLww.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { WorldStateLww } from "../game/net/worldState";
import { Hlc } from "../game/net/clock";

describe("WorldStateLww", () => {
  it("keeps the higher ts", () => {
    const w = new WorldStateLww();
    expect(w.merge("door1", "open", { value: false, ts: 1, by: "A" })).toBe(true);
    expect(w.merge("door1", "open", { value: true, ts: 2, by: "B" })).toBe(true);
    expect(w.merge("door1", "open", { value: false, ts: 1, by: "C" })).toBe(false);
    expect(w.get("door1", "open")).toBe(true);
  });
  it("Hlc is monotonic even within the same wall ms", () => {
    const hlc = new Hlc();
    const a = hlc.now(1000), b = hlc.now(1000), c = hlc.now(1000);
    expect(a < b && b < c).toBe(true);
  });
});
```

`__tests__/itemClaim.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveClaim } from "../game/net/claims";

describe("resolveClaim", () => {
  it("exactly one winner for concurrent claims", () => {
    const res = resolveClaim([
      { entityId: "key", by: "A", ts: 5 },
      { entityId: "key", by: "B", ts: 5 },  // same ts → tie-break by id
    ]);
    expect(res.filter((r) => r.granted)).toHaveLength(1);
    expect(res.find((r) => r.granted)!.by).toBe("A");
  });
  it("first writer (lower ts) wins", () => {
    const res = resolveClaim([
      { entityId: "key", by: "A", ts: 9 },
      { entityId: "key", by: "B", ts: 3 },
    ]);
    expect(res.find((r) => r.granted)!.by).toBe("B");
  });
});
```

## ✅ Verificación
`npm test -w packages/engine-core` verde.

## 📚 References
- `docs/architecture/09-multiplayer.md` §4
- task 09 (rollback del claim rechazado) · task 08 (PartyKit aplica `resolveClaim`)
