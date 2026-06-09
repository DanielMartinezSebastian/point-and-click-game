# Task 05-authority-and-conflict-resolution

**Effort**: 2 days | **Blocks**: 09 | **Blocked by**: 04

---

## 🎯 Objetivo

Resolver conflictos del estado `world`: dos jugadores mutando lo mismo a la vez (p.ej. recoger
el mismo ítem). Implementar reloj lógico HLC y el modelo CRDT-lite (LWW) + protocolo de **claim**
para pickup. Documentar el camino server-authoritative como alternativa con el mismo port.

---

## ✅ Success Criteria

- [ ] `src/game/net/clock.ts`: Hybrid Logical Clock (`now()`, `update(remoteTs)`, comparación)
- [ ] `src/game/net/worldState.ts`: LWW register map `(entityId, field) → { value, ts }` con `merge(remote)`
- [ ] Protocolo de claim de ítem: pickup local optimista → `net:claim` → confirmación/rechazo
- [ ] **first-writer-wins por HLC**: si dos claims chocan, gana el `ts` menor; el perdedor recibe `net:claimRejected` y el ítem vuelve a `placedItems`
- [ ] Tests: merge LWW determinista; claim concurrente resuelve a un único ganador en ambos clientes
- [ ] Documentado cómo el mismo flujo se vuelve server-authoritative (relay valida en vez de LWW)

---

## 📝 Instructions

### Step 1: HLC
Implementa HLC (timestamp físico + contador lógico) para ordenar eventos sin relojes
sincronizados. `update` al recibir cada `NetEnvelope.ts`.

### Step 2: LWW world map
Estado world como mapa de registros con `ts`. `merge` aplica el valor con mayor `ts`
(desempate por `playerId`). Conecta esto a `placedItems`/interaction states.

### Step 3: Claim protocol
Pickup = claim sobre `item:<id>`. Emite optimista local + `net:claim`. En CRDT-lite, el claim
con menor HLC gana; los demás reciben `net:claimRejected`. En server-authoritative, el relay
decide y difunde el resultado. El rollback devuelve el ítem al world y emite `item:claimDenied`.

### Step 4: Testing
`__tests__/worldStateLww.test.ts` y `__tests__/itemClaim.test.ts`: dos sesiones + hub; ambas
recogen el mismo ítem en el "mismo" tick → exactamente una lo conserva; la otra hace rollback.

---

## 📚 References
- `docs/architecture/09-multiplayer.md` §4
- [ADR-0008](../../../decisions/0008-multiplayer-architecture.md) §4
- `packages/engine-core/src/game/state/placedItemsStore.ts` (estado world a reconciliar)
