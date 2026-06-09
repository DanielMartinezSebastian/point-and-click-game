# Phase 14 — Multiplayer (real-time, transport-agnostic)

**Objetivo**: Añadir multijugador en tiempo real respetando la Regla de Oro: el core sigue sin
conocer red, transporte ni proveedor.
**Duración estimada**: 4–6 semanas
**Estado**: planning
**Owner**: Daniel Martínez Sebastián
**Version target**: v0.5.0

---

## 🎯 Por qué

Hoy el motor es single-player. Queremos varios jugadores compartiendo un mundo, cada uno con su
propia pantalla, navegando escenas libremente, donde el estado del mundo (puertas, ítems
colocados) es compartido pero el estado privado (inventario, posición) no. Y debe funcionar en
plataformas serverless como Vercel.

El diseño completo y sus decisiones están en:
- **[ADR-0008](../../decisions/0008-multiplayer-architecture.md)** — decisiones + alternativas
- **[docs/architecture/09-multiplayer.md](../../architecture/09-multiplayer.md)** — diseño detallado

Este README es el plan de ejecución. **Léelos antes de empezar una tarea.**

---

## 📐 Los 4 requisitos → cómo se resuelven

| Requisito del owner | Solución de diseño | Tareas |
|---------------------|--------------------|--------|
| **1. Agnóstico del transporte** | `MultiplayerPort` (igual que audio/i18n). Adapters fuera del core. | 01, 08 |
| **2. Pantalla por jugador + estado world compartido** | Partición `world` / `presence` / `private` + capa de replicación + clasificación de eventos | 02, 03, 04, 06, 07 |
| **3. Vercel / serverless** | Conexión persistente vive en el adapter (PartyKit/Liveblocks/microservicio), no en funciones serverless. Deltas + interest management. | 06, 08 |
| **4. Multi-character futuro** | `characterId` en `PlayerDescriptor` desde el día 1 | 03, 07 |

---

## 🧱 Principios (no romper)

- **Regla de Oro**: el core NO importa `window`, WebSocket, ni proveedor. Solo el `MultiplayerPort`.
- **Reutiliza command/event** ([ADR-0006](../../decisions/0006-command-event-architecture.md)):
  `GameCommand`/`GameEvent` ya son serializables; multiplayer los transporta, no los reemplaza.
- **`private` nunca cruza la red**. Solo `world` y `presence`.
- **Throttle/interpolación en el borde** (renderer), nunca en el motor.
- **Backward compatible**: sin `MultiplayerPort` configurado, el juego funciona single-player igual.

---

## 🗂️ Distribución de archivos (previsto)

### Core (`packages/engine-core`)
```
src/ports/multiplayer.ts                 NEW  MultiplayerPort + NetEnvelope + tipos
src/ports/headlessMultiplayer.ts         NEW  loopback en memoria + InMemoryHub (tests)
src/game/net/playerIdentity.ts           NEW  PlayerDescriptor, PlayerId, characterId
src/game/net/eventClassification.ts      NEW  registry world/presence/private
src/game/net/MultiplayerSession.ts       NEW  replicación EventBus/CommandHandler ↔ port
src/game/net/clock.ts                    NEW  HLC (hybrid logical clock) para LWW
src/game/net/worldState.ts               NEW  LWW register map (modo CRDT-lite)
src/game/state/remotePlayersStore.ts     NEW  presence de otros jugadores (no React)
src/game/events/types.ts                 EDIT net:* events (player joined/left, status)
src/game/commands/types.ts               EDIT net:* commands (join/leave/claim)
src/index.ts                             EDIT exports públicos
```

### Renderer (`packages/engine-renderer-r3f`)
```
src/net/RemotePlayers.tsx                NEW  dibuja avatares de otros (presence + interp.)
src/net/useRemotePlayerInterpolation.ts  NEW  suavizado de posición
```

### Adapters (fuera del core — paquete/módulo aparte)
```
adapters/partykit/   (recomendado)       NEW  implementa MultiplayerPort
adapters/liveblocks/                     NEW  presence + storage LWW
adapters/ws-relay/   (microservicio)     NEW  server-authoritative propio
```

### Demo (`apps/web-demo`)
```
app/lib/net/createMultiplayerRuntime.ts  NEW  cablea runtime + session + adapter
app/components/RemotePlayerLabel.tsx      NEW  nombre/etiqueta sobre avatares remotos
```

---

## 📋 Tareas

- [ ] [01-define-multiplayer-port](tasks/01-define-multiplayer-port.md)
- [ ] [02-state-partition-classification](tasks/02-state-partition-classification.md)
- [ ] [03-player-identity-model](tasks/03-player-identity-model.md)
- [ ] [04-replication-engine](tasks/04-replication-engine.md)
- [ ] [05-authority-and-conflict-resolution](tasks/05-authority-and-conflict-resolution.md)
- [ ] [06-presence-and-interest-management](tasks/06-presence-and-interest-management.md)
- [ ] [07-renderer-remote-avatars](tasks/07-renderer-remote-avatars.md)
- [ ] [08-transport-adapters-and-vercel](tasks/08-transport-adapters-and-vercel.md)
- [ ] [09-optimistic-prediction-reconciliation](tasks/09-optimistic-prediction-reconciliation.md)
- [ ] [10-integration-demo-and-validation](tasks/10-integration-demo-and-validation.md)

---

## 🚦 Orden de ejecución y dependencias

```
01 ─► 02 ─► 04 ─► 06 ─► 07
        │     │
        └► 03 ┘     05 ─► 09
                          │
08 (paralelo desde 01) ───┴──► 10 (validación final)
```

- **Iteración mínima entregable (MVP)**: 01 → 02 → 03 → 04 → 06 → 07 → 08(headless+1 adapter) → 10.
  Da presence + world compartido con un adapter real. Autoridad/conflictos (05) y predicción (09)
  pueden ir en una segunda iteración.

---

## ✅ Resultado esperado (criterio de éxito verificable)

- [ ] Dos pestañas/navegadores ven el avatar del otro **solo cuando comparten escena**.
- [ ] Jugador A abre una puerta → B la ve abierta (world compartido).
- [ ] Jugador A recoge una llave → B deja de verla; A la suelta en zona permitida → B la ve.
- [ ] Dos jugadores intentan el mismo ítem a la vez → solo uno lo obtiene; el otro recibe rechazo.
- [ ] El core sigue **sin** importar red/`window` (test de agnosticismo verde).
- [ ] El juego funciona single-player si no se configura `MultiplayerPort` (no regresión).
- [ ] Demo desplegable en Vercel con un adapter externo documentado.
- [ ] 100% tests passing.

---

## ❓ Open questions

1. ¿MVP server-authoritative (PartyKit) o CRDT-lite (Liveblocks) como camino por defecto?
2. ¿Persistencia del world entre sesiones (reiniciar partida) o efímera por room?
3. ¿Límite de jugadores por room/escena? (afecta fan-out de presence)
4. ¿Reconciliación de inventario si A y B sueltan en la misma celda a la vez?
5. ¿Identidad: anónima por sesión o cuenta persistente?

---

## 📚 Out of scope (Phase 15+)

- Chat/voz, lobbies/matchmaking, spectator mode.
- Sharding de servidores por escena a gran escala.
- Multi-character selection UI (el protocolo lo reserva; la UI es otra fase).
- Replay/recording de partidas.

---

## 📝 Changelog

| Fecha | Acción |
|-------|--------|
| 2026-06-09 | Phase 14 planning — multiplayer agnóstico (ADR-0008 + arquitectura 09) |
