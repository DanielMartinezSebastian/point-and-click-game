# Multiplayer (real-time, transport-agnostic)

**Estado**: propuesta v0.5 | **Última revisión**: 2026-06-09 | Ver [ADR-0008](../decisions/0008-multiplayer-architecture.md)

## TL;DR

Multijugador se construye **encima** del contrato command/event existente
([ADR-0006](../decisions/0006-command-event-architecture.md)), sin tocar la Regla de Oro:

- El transporte es un **port** (`MultiplayerPort`). El core no conoce WebSocket/WebRTC/proveedor.
- El estado se **particiona** en `world` (compartido), `presence` (efímero por jugador) y
  `private` (local).
- Una **capa de replicación** en core puentea `EventBus`/`CommandHandler` ↔ port.
- La **autoridad** (server o CRDT) vive fuera del core; el core predice local y aplica eventos
  confirmados.

```
┌──────────────────────────────────────────────────────────────┐
│ Renderer R3F: avatares locales + RemotePlayers (presence)     │
├──────────────────────────────────────────────────────────────┤
│ Core: EventBus + CommandHandler  ──►  MultiplayerSession      │
│        sceneStore / placedItems   ◄──  (replication + classify)│
│                                          │                     │
│                                  MultiplayerPort (interface)   │
├──────────────────────────────────────────┼────────────────────┤
│ Adapter (fuera del core): PartyKit / Liveblocks / Ably / WS    │
└──────────────────────────────────────────┼────────────────────┘
                                            ▼
                              Relay / Durable Object / servidor
```

## 1. State partition (el corazón del diseño)

| Clase | Ejemplos | Se replica a | Persistente |
|-------|----------|--------------|-------------|
| **world** | puertas abiertas (`interaction states`), `placedItems` por escena, `transitionStates`, claims de ítems | todos | sí |
| **presence** | posición, `sceneId`, acción/orientación, `characterId` | misma escena | no |
| **private** | inventario, diálogo activo, `playerWalkingState` | nadie | local |

**Flujo del ejemplo de la llave**:

1. Jugador A entra a la escena `cave`, hace pickup de `key`.
2. `key` sale de `placedItems[cave]` (**world** → delta replicado: todos dejan de verla).
3. `key` entra al inventario de A (**private** → no se replica).
4. A va a `town`, suelta `key` en una zona permitida (`item-drop`).
5. `key` entra a `placedItems[town]` (**world** → delta replicado: ahora todos la ven en town).

**Flujo de la puerta**: A activa `interaction door:open` → muta `world` → evento
`item:dropped`/interaction state replicado → B (en cualquier escena) ve la puerta abierta al
entrar/estar en esa escena.

## 2. Clasificación de eventos

`GameEvent` ya existe; añadimos un **registry de clasificación** que mapea cada `type` a su
clase. Borrador:

| Event | Clase | Nota |
|-------|-------|------|
| `scene:changed` | presence | cambia *mi* escena → actualiza mi presence |
| `player:moved` | presence | alta frecuencia, throttle en el borde |
| `player:walkStarted/Completed/Aborted` | private | animación local; se deriva de presence |
| `item:pickedUp` | world + private | quita del world, añade a mi inventario |
| `item:dropped` (`place`) | world | aparece en `placedItems` para todos |
| `item:dropped` (`consume`) | world | desaparece para todos |
| `transition:completed` | presence | cambio de escena propio |
| interaction state (puerta) | world | persistente |
| `dialog:triggered/dismissed` | private | diálogo local |

> El registry es la única fuente de verdad sobre qué cruza la red. Añadir un evento nuevo
> obliga a clasificarlo (test de exhaustividad).

## 3. MultiplayerPort

```ts
// engine-core/src/ports/multiplayer.ts
export type PlayerId = string;
export type RoomId = string;

export interface NetEnvelope {
  v: number;            // versión de protocolo
  room: RoomId;
  from: PlayerId;
  ts: number;           // reloj lógico (HLC) para LWW
  kind: "command" | "event" | "presence" | "snapshot" | "claim";
  payload: unknown;     // GameCommand | GameEvent | PresenceState | ...
}

export type ConnectionStatus =
  | { state: "connecting" }
  | { state: "connected"; selfId: PlayerId }
  | { state: "disconnected"; reason?: string };

export interface MultiplayerPort {
  connect(opts: { room: RoomId; player: PlayerDescriptor }): Promise<void> | void;
  disconnect(): void;
  send(message: NetEnvelope): void;
  onMessage(handler: (m: NetEnvelope) => void): () => void;
  onStatus(handler: (s: ConnectionStatus) => void): () => void;
}
```

`HeadlessMultiplayerAdapter` + `InMemoryHub` permiten conectar N sesiones en proceso para tests.

## 4. Autoridad y conflictos

- **Server-authoritative**: clientes mandan `command` (intent); el relay valida, aplica y
  difunde `event` confirmado. Único camino para anti-cheat y resolución determinista.
- **CRDT-lite (LWW + HLC)**: world como mapa `(entityId, field) → { value, ts }`. Conflictos
  se resuelven por mayor `ts`. Claims de ítem = first-writer-wins; el perdedor recibe rechazo y
  el ítem vuelve a `placedItems`.

El **claim de ítem** evita doble pickup: pickup optimista local → enviar `claim` → si el
servidor/CRDT confirma, se mantiene; si no, rollback (devolver al world). Ver task 05 y 09.

## 5. Interest management (latencia / ancho de banda)

- `presence` se *shardea por `sceneId`*: solo fan-out a quienes comparten escena. El servidor
  mantiene canales/rooms por escena.
- `player:moved` (~60Hz) se **throttlea e interpola en el renderer**, nunca en el motor. Enviar
  ~10–15 Hz de posición + interpolar destino.
- Mandar **deltas, no snapshots**. Snapshot completo solo al unirse (`kind: "snapshot"`).
- Payloads compactos (claves cortas, opcional binario/`msgpack` en el adapter).

## 6. Plataformas y proveedores (incl. Vercel)

**Limitación clave de Vercel**: las funciones serverless/edge **no mantienen conexiones
WebSocket persistentes** ni estado en memoria entre invocaciones. La app Next.js puede
desplegarse en Vercel, pero la **conexión realtime debe vivir en otro sitio** (un adapter que
apunte a un servicio externo). El core es indiferente a esto.

| Adapter | Topología | Vercel-friendly | Notas |
|---------|-----------|-----------------|-------|
| **PartyKit** (recomendado) | server-authoritative (Durable Objects, Cloudflare) | ✅ (servicio aparte) | room = escena/partida; barato; baja latencia edge |
| **Liveblocks** | CRDT/storage + presence | ✅ | presence integrada; storage = world LWW; menos control de lógica server |
| **Ably / Pusher** | pub/sub gestionado | ✅ | simple; tú resuelves autoridad/conflictos |
| **Supabase Realtime** | pub/sub + Postgres | ✅ | persistencia world en Postgres gratis |
| **WS microservicio** (Fly.io/Railway/Render) | server-authoritative propio | ✅ (fuera de Vercel) | control total; tú operas el proceso |
| **WebRTC (P2P)** | peer/CRDT | ⚠️ | sin server; NAT traversal frágil; opcional |

**Regla**: cada fila = un paquete/módulo adapter que implementa `MultiplayerPort`. Cambiar de
proveedor no toca core ni demo.

**Transferencia eficiente** (resumen accionable):
1. Solo cruza la red lo `world` y `presence` (nunca `private`).
2. Deltas + snapshot inicial al unirse.
3. Presence shardeada por escena + throttle ~10–15Hz + interpolación en cliente.
4. HLC para LWW determinista sin relojes sincronizados.
5. Reconexión: re-pedir snapshot, reconciliar contra estado optimista local.

## Ver también

- [ADR-0008](../decisions/0008-multiplayer-architecture.md) — decisiones y alternativas
- `docs/phases/phase-14-multiplayer/` — plan de ejecución por tareas
- [ADR-0006](../decisions/0006-command-event-architecture.md) — command/event (base)
- `docs/architecture/04-platform-ports.md` — patrón de ports
