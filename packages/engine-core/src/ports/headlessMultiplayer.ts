import type {
  ConnectOptions,
  ConnectionStatus,
  MultiplayerPort,
  NetEnvelope,
  PlayerId,
} from "./multiplayer";

/**
 * Bus en memoria que conecta varios HeadlessMultiplayerAdapter (simula la red
 * en tests). Reenvía cada `send` a los demás adapters de la MISMA room.
 */
interface HubPeer {
  room: string;
  inbound: (m: NetEnvelope) => void;
}

export class InMemoryHub {
  private peers = new Map<PlayerId, HubPeer>();

  register(
    id: PlayerId,
    room: string,
    inbound: (m: NetEnvelope) => void,
  ): () => void {
    this.peers.set(id, { room, inbound });
    return () => this.peers.delete(id);
  }

  /** Fan-out a los peers de la MISMA room que el mensaje, menos al emisor. */
  broadcast(from: PlayerId, _room: string, message: NetEnvelope): void {
    for (const [id, peer] of this.peers) {
      if (id === from) continue;
      if (peer.room !== message.room) continue; // aísla por room del receptor
      peer.inbound(message);
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

  constructor(
    private hub: InMemoryHub,
    selfId?: PlayerId,
  ) {
    this.selfId = selfId ?? `headless-${++_autoId}`;
  }

  connect(opts: ConnectOptions): void {
    this.room = opts.room;
    this.connected = true;
    this.unregister = this.hub.register(this.selfId, this.room, (m) => {
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
    return () => {
      this.msgHandlers = this.msgHandlers.filter((h) => h !== handler);
    };
  }

  onStatus(handler: (s: ConnectionStatus) => void): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  private emitStatus(s: ConnectionStatus): void {
    this.statusHandlers.forEach((h) => h(s));
  }
}
