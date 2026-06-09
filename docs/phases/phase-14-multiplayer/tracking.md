# Phase 14: Tracking

> Marca `[x]` al completar. Detalle en cada task file. Ver `docs/workflow/how-to-track-tasks.md`.

## Week 1 — Fundamentos agnósticos (core)
- [x] [01-define-multiplayer-port](tasks/01-define-multiplayer-port.md)
- [x] [02-state-partition-classification](tasks/02-state-partition-classification.md)
- [x] [03-player-identity-model](tasks/03-player-identity-model.md)

## Week 2 — Replicación
- [x] [04-replication-engine](tasks/04-replication-engine.md)
- [x] [06-presence-and-interest-management](tasks/06-presence-and-interest-management.md)

## Week 3 — Render + adapter PartyKit + rooms
- [x] [07-renderer-remote-avatars](tasks/07-renderer-remote-avatars.md)
- [x] [08-transport-adapters-and-vercel](tasks/08-transport-adapters-and-vercel.md) (PartyKit)
- [ ] [10-room-session-lifecycle](tasks/10-room-session-lifecycle.md) (código, join, solo, reset, cap 4)

## Week 4 — Autoridad y robustez (segunda iteración)
- [x] [05-authority-and-conflict-resolution](tasks/05-authority-and-conflict-resolution.md)
- [x] [09-optimistic-prediction-reconciliation](tasks/09-optimistic-prediction-reconciliation.md)

## Week 5 — Demo /multiplayer + validación
- [x] [11-demo-multiplayer-route](tasks/11-demo-multiplayer-route.md) (ruta `/multiplayer`, lobby, RemotePlayers)
- [~] [12-validation-gate](tasks/12-validation-gate.md) — gate automático ✅; escenarios two-tab E2E pendientes de run manual

---

## Gates
- [x] Test de agnosticismo del core verde (sin imports de red/`window`/localStorage)
- [x] No regresión single-player (suite actual pasa sin `MultiplayerPort`; fallos web-demo son pre-existentes)
- [ ] Demo two-tab manual: presence + room (código/solo/reset/cap 4) — pendiente de run con `party:dev`

> Estado: **MVP implementado** (tasks 01–11). Ver `validation-report.md`. 273 tests core + 6 roomSession verdes.
