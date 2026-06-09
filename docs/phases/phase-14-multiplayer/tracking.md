# Phase 14: Tracking

> Marca `[x]` al completar. Detalle en cada task file. Ver `docs/workflow/how-to-track-tasks.md`.

## Week 1 — Fundamentos agnósticos (core)
- [ ] [01-define-multiplayer-port](tasks/01-define-multiplayer-port.md)
- [ ] [02-state-partition-classification](tasks/02-state-partition-classification.md)
- [ ] [03-player-identity-model](tasks/03-player-identity-model.md)

## Week 2 — Replicación
- [ ] [04-replication-engine](tasks/04-replication-engine.md)
- [ ] [06-presence-and-interest-management](tasks/06-presence-and-interest-management.md)

## Week 3 — Render + adapter PartyKit + rooms
- [ ] [07-renderer-remote-avatars](tasks/07-renderer-remote-avatars.md)
- [ ] [08-transport-adapters-and-vercel](tasks/08-transport-adapters-and-vercel.md) (PartyKit)
- [ ] [10-room-session-lifecycle](tasks/10-room-session-lifecycle.md) (código, join, solo, reset, cap 4)

## Week 4 — Autoridad y robustez (segunda iteración)
- [ ] [05-authority-and-conflict-resolution](tasks/05-authority-and-conflict-resolution.md)
- [ ] [09-optimistic-prediction-reconciliation](tasks/09-optimistic-prediction-reconciliation.md)

## Week 5 — Integración y validación
- [ ] [11-integration-demo-and-validation](tasks/11-integration-demo-and-validation.md)

---

## Gates
- [ ] Test de agnosticismo del core verde (sin imports de red/`window`/localStorage)
- [ ] No regresión single-player (suite actual pasa sin `MultiplayerPort`)
- [ ] Demo two-tab manual: presence + world + claim + room (código/solo/reset/cap 4) verificados
