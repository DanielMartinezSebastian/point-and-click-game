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
| **1. Agnóstico del transporte** | `MultiplayerPort` (igual que audio/i18n). Adapter **PartyKit** fuera del core. | 01, 08 |
| **2. Pantalla por jugador + estado world compartido** | Partición `world` / `presence` / `private` + capa de replicación + clasificación de eventos | 02, 03, 04, 06, 07 |
| **3. Vercel / serverless** | Conexión persistente en PartyKit (no en funciones serverless). Rooms por código, deltas + interest management. | 06, 08, 10 |
| **4. Multi-character futuro** | `characterId` en `PlayerDescriptor` desde el día 1; nombre anónimo aleatorio cambiable | 03, 07 |

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
src/game/net/playerIdentity.ts           NEW  PlayerDescriptor, PlayerId, characterId, generateRandomName
src/game/net/eventClassification.ts      NEW  registry world/presence/private
src/game/net/MultiplayerSession.ts       NEW  replicación EventBus/CommandHandler ↔ port
src/game/net/clock.ts                    NEW  HLC (hybrid logical clock) para LWW
src/game/net/worldState.ts               NEW  LWW register map (modo CRDT-lite)
src/game/state/remotePlayersStore.ts     NEW  presence de otros jugadores (no React)
src/game/events/types.ts                 EDIT net:* events (player joined/left, status)
src/game/commands/types.ts               EDIT net:* commands (join/leave/claim/setName)
src/index.ts                             EDIT exports públicos
```

### Renderer (`packages/engine-renderer-r3f`)
```
src/net/RemotePlayers.tsx                NEW  dibuja avatares de otros (presence + interp.)
src/net/useRemotePlayerInterpolation.ts  NEW  suavizado de posición
```

### Adapter PartyKit (fuera del core — elección por defecto)
```
adapters/partykit/server.ts              NEW  room por código, autoridad world, cap 4
adapters/partykit/client.ts              NEW  implementa MultiplayerPort
adapters/liveblocks|ws-relay/            DOC  alternativas documentadas (no implementadas)
```

### Demo (`apps/web-demo`)
```
app/lib/net/createMultiplayerRuntime.ts  NEW  cablea runtime + session + adapter PartyKit
app/lib/net/roomCodeStorage.ts           NEW  persistencia del código en localStorage (platform)
app/components/RoomLobby.tsx             NEW  crear/unirse por código, aviso N/4, reset room
app/components/RemotePlayerLabel.tsx      NEW  nombre (editable) sobre avatares remotos
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
- [ ] [10-room-session-lifecycle](tasks/10-room-session-lifecycle.md)
- [ ] [11-demo-multiplayer-route](tasks/11-demo-multiplayer-route.md) — ruta `/multiplayer`
- [ ] [12-validation-gate](tasks/12-validation-gate.md)

> **Cada task es implementation-grade**: incluye archivos exactos, código copy-paste, firmas de
> tipos y tests con asserts, pensada para que un modelo sencillo (Sonnet/Haiku) la ejecute aislada
> sin re-derivar el diseño. Lee el task file completo antes de empezar.

---

## 🚦 Orden de ejecución y dependencias

```
01 ─► 02 ─► 04 ─► 06 ─► 07 ─────────────────┐
        │     │                              │
        └► 03 ┘     05 ─► 09 ───────────────►├─► 11 (/multiplayer) ─► 12 (gate)
              │                              │
08 ─► 10 ─────┴──────────────────────────────┘
(08 paralelo desde 01; 10 = room/lobby; 11 = demo route)
```

- **Iteración mínima entregable (MVP)**: 01 → 02 → 03 → 04 → 06 → 07 → 08(PartyKit) → 10 → 11 → 12.
  Da **presence en tiempo real** (avatares) + rooms por código en `/multiplayer`. Autoridad/conflictos
  (05), predicción/rollback (09) e item-sync completo son la **2ª iteración**.

---

## ✅ Resultado esperado (criterio de éxito verificable)

- [ ] Dos pestañas/navegadores ven el avatar del otro **solo cuando comparten escena**.
- [ ] Jugador A abre una puerta → B la ve abierta (world compartido).
- [ ] Jugador A recoge una llave → B deja de verla; A la suelta en zona permitida → B la ve.
- [ ] Dos jugadores intentan el mismo ítem a la vez → solo uno lo obtiene; el otro recibe rechazo.
- [ ] Crear room genera un **código**; otro jugador se une con ese código; **localStorage** lo recuerda.
- [ ] **Solo-play** funciona; UI avisa de plazas libres (`N/4`); **reset** arranca una room nueva.
- [ ] **5º jugador** rechazado (`room-full`); límite de 4 aplicado en el server.
- [ ] El core sigue **sin** importar red/`window`/localStorage (test de agnosticismo verde).
- [ ] El juego funciona single-player si no se configura `MultiplayerPort` (no regresión).
- [ ] Demo desplegable en Vercel con PartyKit como adapter externo documentado.
- [ ] 100% tests passing.

---

## ✅ Decisiones tomadas (2026-06-09)

Las open questions iniciales quedaron resueltas por el owner:

1. **Autoridad → PartyKit (server-authoritative)**. Fijo: cambiar de modelo de autoridad después
   es caro. Liveblocks/WS quedan como alternativas documentadas detrás del mismo port.
2. **Sesiones con rooms por código (world efímero en memoria)**:
   - Cada cliente puede **crear** una room (genera un **código** compartible) o **unirse** con un código.
   - El código se **guarda en localStorage** (platform adapter del app, NO en core) y se reusa por
     defecto al volver. Si el otro player no está, se puede **continuar en solitario**, pero la UI
     **avisa de plazas libres** (`N/4`).
   - **Reset room**: generar una room nueva (vacía) y jugar en solitario hasta que entre alguien.
   - El world es **efímero por room** (en memoria de PartyKit), pero serializable para añadir
     persistencia server-side más adelante sin rediseño.
3. **Límite: 4 jugadores por room**. El 5º join se rechaza (`room-full`). Tráfico de presence
   despreciable a este tamaño.
4. **Identidad anónima con nombre aleatorio** (p.ej. "Viajero-A3F"), **cambiable** por el jugador
   (`net:setName`). Sin login/cuenta por ahora; reservado para una fase futura.

> Detalle del ciclo de vida de room en [task 10](tasks/10-room-session-lifecycle.md). El conflicto
> de inventario concurrente (antigua Q4) se resuelve vía claim server-authoritative en
> [task 05](tasks/05-authority-and-conflict-resolution.md).

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
| 2026-06-09 | Decisiones del owner: PartyKit, rooms por código (efímero+localStorage, solo/reset), cap 4, nombre anónimo cambiable. Nueva task 10 (room lifecycle); integración → 11 |
| 2026-06-09 | Plan end-to-end implementation-grade: 12 tasks con código copy-paste + tests; ruta `/multiplayer` (task 11) + validation gate (task 12). Listo para ejecutar por Sonnet/Haiku |
