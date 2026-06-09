# Task 01-define-multiplayer-port

**Effort**: 1 day | **Blocks**: 02,04,08,10 | **Blocked by**: —

---

## 🎯 Objetivo

Definir el contrato agnóstico de transporte (`MultiplayerPort`) + el sobre serializable
(`NetEnvelope`) en `engine-core`, y un adapter headless de loopback (`HeadlessMultiplayerAdapter`
+ `InMemoryHub`) para tests. El core nunca toca WebSocket/proveedor: solo esta interfaz.

> **Para el implementador**: copia los bloques de código tal cual. No importes nada de `apps/`,
> `window`, `WebSocket`, ni de `game/net/*` (eso vendría de otras tasks y crearía ciclos).

---

## 📁 Archivos

- **CREAR** `packages/engine-core/src/ports/multiplayer.ts`
- **CREAR** `packages/engine-core/src/ports/headlessMultiplayer.ts`
- **CREAR** `packages/engine-core/src/__tests__/multiplayerPort.test.ts`
- **EDITAR** `packages/engine-core/src/ports/index.ts` (añadir exports)

---

## ✅ Success Criteria

- [ ] `MultiplayerPort`, `NetEnvelope`, `ConnectionStatus`, `ConnectOptions`, `RoomId`, `PlayerId`, `NET_PROTOCOL_VERSION` exportados
- [ ] `HeadlessMultiplayerAdapter` implementa `MultiplayerPort`; `InMemoryHub` conecta N adapters
- [ ] Test: A.send llega a B.onMessage (no a sí mismo); onStatus reporta connected/disconnected
- [ ] `npm test -w packages/engine-core` verde
- [ ] No imports de red/`window`/`apps/`

---

## 📝 Step 1 — `ports/multiplayer.ts`

```ts
/** Identificadores. */
export type PlayerId = string;
export type RoomId = string;

/** Versión del protocolo de red. Súbela ante cambios incompatibles del sobre. */
export const NET_PROTOCOL_VERSION = 1;

/** Tipo de carga del sobre. `payload` se interpreta según este discriminador. */
export type NetEnvelopeKind =
  | "command"      // payload: GameCommand (intent del cliente)
  | "event"        // payload: GameEvent (mutación world confirmada)
  | "presence"     // payload: PlayerDescriptor parcial (posición/escena)
  | "snapshot"     // payload: estado world completo al unirse
  | "claim"        // payload: { entityId } reclamo de ítem
  | "claim-result";// payload: { entityId; granted: boolean }

/** Sobre serializable que viaja por el cable. SIEMPRE JSON-serializable. */
export interface NetEnvelope<T = unknown> {
  /** Versión de protocolo (NET_PROTOCOL_VERSION). */
  v: number;
  /** Room/partida destino. */
  room: RoomId;
  /** Emisor. */
  from: PlayerId;
  /** Reloj lógico (HLC en task 05; Date.now() hasta entonces). Para ordenar/LWW. */
  ts: number;
  /** Discriminador de payload. */
  kind: NetEnvelopeKind;
  /** Carga; su forma depende de `kind`. */
  payload: T;
}

/** Estado de conexión reportado por el transporte. */
export type ConnectionStatus =
  | { state: "connecting" }
  | { state: "connected"; selfId: PlayerId }
  | { state: "disconnected"; reason?: string };

/** Opciones para conectar a una room. `selfId` puede asignarlo el servidor. */
export interface ConnectOptions {
  room: RoomId;
  selfId?: PlayerId;
}

/**
 * Puerto agnóstico de transporte multijugador. Implementado fuera del core por
 * adapters (PartyKit, headless, …). El core SOLO habla con esta interfaz.
 */
export interface MultiplayerPort {
  /** Abre la conexión a la room. Idempotente si ya conectado. */
  connect(opts: ConnectOptions): Promise<void> | void;
  /** Cierra la conexión y libera recursos. */
  disconnect(): void;
  /** Envía un sobre a los peers (o al relay, que hace fan-out). Fire-and-forget. */
  send(message: NetEnvelope): void;
  /** Suscribe a sobres entrantes. Devuelve unsubscribe. */
  onMessage(handler: (message: NetEnvelope) => void): () => void;
  /** Suscribe a cambios de estado de conexión. Devuelve unsubscribe. */
  onStatus(handler: (status: ConnectionStatus) => void): () => void;
}
```

## 📝 Step 2 — `ports/headlessMultiplayer.ts`

```ts
import type {
  ConnectOptions, ConnectionStatus, MultiplayerPort, NetEnvelope, PlayerId,
} from "./multiplayer";

/**
 * Bus en memoria que conecta varios HeadlessMultiplayerAdapter (simula la red
 * en tests). Reenvía cada `send` a los demás adapters de la MISMA room.
 */
export class InMemoryHub {
  private peers = new Map<PlayerId, (m: NetEnvelope) => void>();

  register(id: PlayerId, inbound: (m: NetEnvelope) => void): () => void {
    this.peers.set(id, inbound);
    return () => this.peers.delete(id);
  }

  /** Fan-out a todos menos al emisor (sin self-echo). */
  broadcast(from: PlayerId, room: string, message: NetEnvelope): void {
    for (const [id, inbound] of this.peers) {
      if (id === from) continue;
      if (message.room !== room) continue;
      inbound(message);
    }
  }
}

let _autoId = 0;

/** Adapter de loopback para tests. Implementa MultiplayerPort contra un InMemoryHub. */
export class HeadlessMultiplayerAdapter implements MultiplayerPort {
  readonly selfId: PlayerId;
  private room = "";
  private connected = false;
  private unregister: (() => void) | null = null;
  private msgHandlers: Array<(m: NetEnvelope) => void> = [];
  private statusHandlers: Array<(s: ConnectionStatus) => void> = [];

  constructor(private hub: InMemoryHub, selfId?: PlayerId) {
    this.selfId = selfId ?? `headless-${++_autoId}`;
  }

  connect(opts: ConnectOptions): void {
    this.room = opts.room;
    this.connected = true;
    this.unregister = this.hub.register(this.selfId, (m) => {
      this.msgHandlers.forEach((h) => h(m));
    });
    this.emitStatus({ state: "connected", selfId: this.selfId });
  }

  disconnect(): void {
    this.connected = false;
    this.unregister?.();
    this.unregister = null;
    this.emitStatus({ state: "disconnected" });
  }

  send(message: NetEnvelope): void {
    if (!this.connected) return;
    this.hub.broadcast(this.selfId, this.room, message);
  }

  onMessage(handler: (m: NetEnvelope) => void): () => void {
    this.msgHandlers.push(handler);
    return () => { this.msgHandlers = this.msgHandlers.filter((h) => h !== handler); };
  }

  onStatus(handler: (s: ConnectionStatus) => void): () => void {
    this.statusHandlers.push(handler);
    return () => { this.statusHandlers = this.statusHandlers.filter((h) => h !== handler); };
  }

  private emitStatus(s: ConnectionStatus): void {
    this.statusHandlers.forEach((h) => h(s));
  }
}
```

## 📝 Step 3 — exports en `ports/index.ts`

Añade al final:
```ts
export type {
  PlayerId, RoomId, NetEnvelope, NetEnvelopeKind, ConnectionStatus,
  ConnectOptions, MultiplayerPort,
} from "./multiplayer";
export { NET_PROTOCOL_VERSION } from "./multiplayer";
export { HeadlessMultiplayerAdapter, InMemoryHub } from "./headlessMultiplayer";
```

## 📝 Step 4 — Test `__tests__/multiplayerPort.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { HeadlessMultiplayerAdapter, InMemoryHub } from "../ports/headlessMultiplayer";
import { NET_PROTOCOL_VERSION, type NetEnvelope } from "../ports/multiplayer";

const env = (from: string, room = "r1"): NetEnvelope => ({
  v: NET_PROTOCOL_VERSION, room, from, ts: 1, kind: "event", payload: { type: "ping" },
});

describe("MultiplayerPort headless", () => {
  it("delivers a sent message to peers but not to self", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const b = new HeadlessMultiplayerAdapter(hub, "B");
    a.connect({ room: "r1" }); b.connect({ room: "r1" });
    const aSeen = vi.fn(); const bSeen = vi.fn();
    a.onMessage(aSeen); b.onMessage(bSeen);
    a.send(env("A"));
    expect(bSeen).toHaveBeenCalledTimes(1);
    expect(aSeen).not.toHaveBeenCalled();
  });

  it("does not deliver across different rooms", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const b = new HeadlessMultiplayerAdapter(hub, "B");
    a.connect({ room: "r1" }); b.connect({ room: "r2" });
    const bSeen = vi.fn(); b.onMessage(bSeen);
    a.send(env("A", "r1"));
    expect(bSeen).not.toHaveBeenCalled();
  });

  it("reports connected/disconnected status", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const seen: string[] = [];
    a.onStatus((s) => seen.push(s.state));
    a.connect({ room: "r1" }); a.disconnect();
    expect(seen).toEqual(["connected", "disconnected"]);
  });
});
```

## ✅ Verificación
`npm test -w packages/engine-core` → verde. Revisar que `multiplayer.ts` no importa nada externo.

## 📚 References
- `docs/architecture/09-multiplayer.md` §3
- `packages/engine-core/src/ports/i18n.ts` + `headlessI18n.ts` (patrón port + headless)
