# ADR-0008: Multiplayer Architecture (agnostic transport + state partition)

**Estado**: Aceptado (decisiones confirmadas 2026-06-09) | **Fecha**: 2026-06-09 | **Autores**: Daniel Martínez Sebastián

## Context

El motor es single-player. Queremos multijugador en tiempo real con estos requisitos
(planteados por el owner):

1. **Agnóstico de transporte**: el core no debe conocer WebSocket, WebRTC, SSE, ni ningún
   proveedor (PartyKit, Liveblocks, Ably, Supabase…). El frontend/microservicio elige.
2. **Pantalla por jugador**: cada jugador navega escenas de forma independiente. Varios
   jugadores pueden estar en escenas distintas a la vez, **compartiendo el estado del mundo**
   (puertas abiertas, ítems colocados) pero **no su estado privado** (inventario, posición).
   - Un jugador recoge una llave → la llave es suya, nadie más la ve salvo que la deje en un
     sitio permitido para que otro la recoja.
   - Un jugador abre una puerta → queda abierta para todos.
3. **Compatible con Vercel** y otras plataformas serverless con límites de conexiones
   persistentes. Debe documentarse la transferencia de datos más eficiente.
4. **Hoy un solo personaje**, mañana varios seleccionables. El modelo de identidad debe
   reservar `characterId` desde el principio.

El motor ya tiene la base ideal (ver [ADR-0006](0006-command-event-architecture.md)):
`GameCommand` (entrada serializable) + `GameEvent` (salida serializable) + `EventBus` +
`CommandHandler`, todos sin React/R3F. Multiplayer se construye **encima** de ese contrato,
no lo reemplaza.

### Decisiones del owner (2026-06-09)

1. **Autoridad → PartyKit (server-authoritative)**. Elección fija.
2. **Sesiones con rooms por código**, world efímero en memoria (serializable para persistir luego).
   Código guardado en localStorage (cliente), solo-play permitido con aviso de plazas, reset a room nueva.
3. **Límite 4 jugadores** por room.
4. **Identidad anónima con nombre aleatorio cambiable** (`net:setName`); sin login por ahora.

## Decision

### 1. El transporte es un Port (igual que audio/i18n/input)

Se define `MultiplayerPort` en `engine-core/src/ports/multiplayer.ts`. El core habla solo
con esta interfaz; un adapter por proveedor la implementa fuera del core. Se incluye
`HeadlessMultiplayerAdapter` (loopback en memoria) para tests sin red.

```ts
interface MultiplayerPort {
  connect(opts: ConnectOptions): Promise<void> | void;
  disconnect(): void;
  send(message: NetEnvelope): void;                       // a peers / al relay
  onMessage(handler: (m: NetEnvelope) => void): () => void;
  onStatus(handler: (s: ConnectionStatus) => void): () => void;
}
```

`NetEnvelope` es el sobre serializable que viaja por el cable (versión de protocolo, tipo,
`playerId`, `roomId`, timestamp lógico, payload). Reutiliza `GameCommand`/`GameEvent` como
payload siempre que sea posible para no duplicar contratos.

### 2. Partición explícita del estado: world / presence / private

El núcleo del diseño. Cada pieza de estado se clasifica:

| Clase | Qué incluye | Sincronización | Persistencia |
|-------|-------------|----------------|--------------|
| **world** (compartido, autoritativo) | interaction states (puertas), `placedItems` por escena, `transitionStates`, claims de ítems | Replicado a **todos** | Sí (sobrevive a desconexión) |
| **presence** (efímero, por jugador) | posición, `sceneId`, acción/orientación, `characterId` | Fan-out solo a jugadores **en la misma escena** | No |
| **private** (local, por jugador) | inventario, diálogo activo, `playerWalkingState` | No se replica (salvo cuando muta el world) | Local |

Esta partición resuelve directamente el requisito 2: la llave recogida sale del `world`
(`placedItems`) y entra en el `private` inventory del jugador; al soltarla en una zona
permitida vuelve al `world` y se hace visible para todos. La puerta abierta es `world` → se
ve para todos.

### 3. Capa de replicación en el core (agnóstica)

`MultiplayerSession` (core) hace de puente entre `EventBus`/`CommandHandler` y el
`MultiplayerPort`:

- **Salida**: escucha `GameEvent`, los clasifica (world / presence / private) vía un
  **registry de clasificación**, serializa los relevantes en `NetEnvelope` y los manda por el
  port. Los `private` nunca salen.
- **Entrada**: recibe `NetEnvelope` remotos, los aplica como mutaciones/commands **marcados
  con origen `remote`** para que NO se vuelvan a difundir (prevención de bucles).
- Mantiene un store `remotePlayers` (presence) que el renderer usa para dibujar avatares.

### 4. Modelo de autoridad: dos topologías, mismo port

El port soporta ambas; **se elige server-authoritative con PartyKit** por defecto (decisión 1):

- **Server-authoritative (relay/host)**: un proceso valida mutaciones del world y es la fuente
  de verdad; los clientes mandan *intents*, reciben eventos confirmados. Resuelve conflictos y
  anti-cheat de forma natural, y hace de host de la room. **ELEGIDO** (PartyKit / Durable Object).
- **Optimista / CRDT-lite**: world como mapa de registros *last-write-wins* por
  `(entityId, field)` con reloj lógico (HLC/Lamport). No requiere servidor de juego dedicado;
  encaja con almacenamiento de proveedores realtime (Liveblocks/Yjs). El claim de ítems usa
  first-writer-wins por HLC; el perdedor recibe un evento de rechazo y el ítem vuelve.

El core no impone la elección: la autoridad vive en el adapter/servidor; el core solo aplica
eventos confirmados y predice localmente (ver task 09).

### 4b. Rooms / sesiones (decisión 2)

- Room identificada por un **código compartible** (crear genera el código; unirse lo introduce).
- **World efímero** en memoria de la room (PartyKit); serializable → persistencia futura sin rediseño.
- El **código se persiste en localStorage** del cliente (platform adapter del app, **no** en core).
- **Solo-play** permitido (1 jugador opera el world); UI avisa de plazas libres (`N/4`).
- **Reset room** = nueva room vacía. **Capacidad 4**: el 5º join se rechaza (`room-full`).

### 5. Interest management para minimizar latencia/ancho de banda

- **world** se replica globalmente (las puertas persisten aunque cambies de escena), pero su
  volumen es bajo y por deltas.
- **presence** (alta frecuencia, ~60Hz para `player:moved`) se *shard-ea por `sceneId`*: solo
  se hace fan-out a quienes están en la misma escena. Se aplica throttle/interpolación en el
  borde (renderer), nunca en el motor.

### 6. Identidad y personajes

`PlayerDescriptor = { playerId, displayName, characterId, sceneId, ... }`. `characterId`
existe desde el día 1 (hoy un único valor por defecto) para no romper el protocolo cuando se
añadan personajes seleccionables. `displayName` arranca con un **nombre anónimo aleatorio** y es
**cambiable** por el jugador (`net:setName`); sin login/cuenta por ahora (decisión 4).

## Consequences

**Facilita**:
- Cambiar de proveedor = escribir otro adapter; el core y la demo no cambian.
- Testear multijugador sin red (hub en memoria conectando N sesiones headless).
- Vercel-friendly: la conexión persistente vive en el adapter (PartyKit/Liveblocks/microservicio),
  no en funciones serverless. Ver `docs/architecture/09-multiplayer.md`.

**Complica**:
- Hay que clasificar cada `GameEvent`/estado (world/presence/private) y mantener ese registry.
- Optimistic prediction + reconciliación añade complejidad (task 09); se puede entregar en una
  segunda iteración (presence-only primero).

**Deja para futuro**:
- Voz/chat, lobbies/matchmaking, autoridad por escena (sharding de servidores), spectator mode.

## Alternatives considered

- **Meter WebSocket directo en el core**: descartado — viola la Regla de Oro (core sin `window`,
  sin red concreta) y ataría el motor a un transporte.
- **Sincronizar TODO el estado (incl. inventario y posición de cada jugador a todos)**:
  descartado — rompe el requisito 2 (la llave sería visible para todos) y desperdicia ancho de
  banda. La partición world/presence/private es esencial.
- **Solo P2P WebRTC**: descartado como única vía — NAT traversal frágil, sin autoridad central
  para resolver claims; se ofrece como adapter opcional, no como base.

## References

- [ADR-0006](0006-command-event-architecture.md) — base command/event sobre la que se construye
- `docs/architecture/09-multiplayer.md` — diseño detallado + tabla de proveedores + Vercel
- `docs/phases/phase-14-multiplayer/README.md` — plan de ejecución
- Ports existentes como referencia: `packages/engine-core/src/ports/i18n.ts`, `audio.ts`
