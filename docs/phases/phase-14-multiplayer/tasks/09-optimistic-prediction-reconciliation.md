# Task 09-optimistic-prediction-reconciliation

**Effort**: 1.5 days | **Blocks**: 10 | **Blocked by**: 05

---

## 🎯 Objetivo

Minimizar la latencia percibida (requisito 3): aplicar acciones del jugador local de forma
optimista inmediata y reconciliar si el servidor/CRDT las corrige o rechaza. Sin esto, cada
acción esperaría el round-trip.

---

## ✅ Success Criteria

- [ ] Acciones world locales (pickup, abrir puerta, drop) se aplican **localmente ya** y se envían en paralelo
- [ ] Si llega confirmación coincidente → no-op. Si llega corrección/rechazo → **rollback** al estado confirmado
- [ ] Rollback del claim de ítem rechazado: el ítem vuelve a `placedItems`, sale del inventario, evento `item:claimDenied`
- [ ] Reconexión: re-pedir snapshot, descartar predicciones no confirmadas, reaplicar
- [ ] Tests: predicción aceptada (sin glitch) y predicción rechazada (rollback limpio)

---

## 📝 Instructions

### Step 1: Pending actions buffer
Mantén una cola de acciones optimistas pendientes de confirmación, con su HLC. Aplica al estado
local inmediatamente; marca como "pending".

### Step 2: Reconciliación
Al recibir el evento confirmado (server) o el merge LWW (CRDT): si coincide, retira de pending.
Si difiere, revierte la predicción y aplica el valor confirmado. Para movimiento propio NO se
predice nada de remotos (eso es interpolación, task 07).

### Step 3: Reconexión
Tras reconnect, snapshot del world manda: limpia pending no confirmadas y reaplica sobre el
snapshot fresco.

### Step 4: Testing
`__tests__/optimisticReconcile.test.ts`: claim aceptado mantiene estado; claim rechazado revierte
exactamente al estado previo (ítem de vuelta en world).

---

## 📚 References
- task 05 (claim protocol + HLC + LWW)
- `docs/architecture/09-multiplayer.md` §4–§5
- `packages/engine-core/src/game/state/placedItemsStore.ts`, `sceneStore.ts`
