# Task 02-state-partition-classification

**Effort**: 1 day | **Blocks**: 04,06 | **Blocked by**: 01

---

## 🎯 Objetivo

Implementar la clasificación `world` / `presence` / `private` como un **registry** que mapea
cada `GameEvent["type"]` a su clase de sincronización. Esta es la única fuente de verdad sobre
qué cruza la red. Es la pieza que resuelve el requisito 2 (estado compartido vs privado).

---

## ✅ Success Criteria

- [ ] `src/game/net/eventClassification.ts` con `SyncClass = "world" | "presence" | "private"` y un mapa exhaustivo `classifyEvent(type): SyncClass[]`
- [ ] Un evento puede ser **multi-clase** (p.ej. `item:pickedUp` = `["world","private"]`)
- [ ] Test de **exhaustividad**: cada `GameEventType` tiene clasificación (falla en compile/test si se añade un evento sin clasificar)
- [ ] `private` documentado como "nunca cruza la red"
- [ ] Tabla de clasificación inicial coincide con `docs/architecture/09-multiplayer.md` §2
- [ ] No breaking changes

---

## 📝 Instructions

### Step 1: Tipos
Define `SyncClass` y `EventClassification = Record<GameEventType, SyncClass[]>`. Usa un objeto
tipado para que TypeScript exija cubrir todos los tipos (`satisfies Record<GameEventType, ...>`).

### Step 2: Mapa inicial
Rellena según §2 del doc de arquitectura. Claves: presence (`scene:changed`, `player:moved`,
`transition:completed`), world (`item:dropped` place/consume, interaction states), private
(diálogos, walk states, audio). Documenta cada decisión no obvia con un comentario corto.

### Step 3: Helpers
`isWorld(type)`, `isPresence(type)`, `shouldReplicate(type)` (= world||presence). Estos los
consumirá `MultiplayerSession` (task 04).

### Step 4: Testing
`__tests__/eventClassification.test.ts`: exhaustividad (todos los tipos presentes), y casos
puntuales (`item:pickedUp` incluye world; `dialog:triggered` es solo private).

---

## 📚 References
- `docs/architecture/09-multiplayer.md` §2
- `packages/engine-core/src/game/events/types.ts` (union de eventos)
- [ADR-0008](../../../decisions/0008-multiplayer-architecture.md) §2
