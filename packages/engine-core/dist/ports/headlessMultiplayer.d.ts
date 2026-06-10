import type { ConnectOptions, ConnectionStatus, MultiplayerPort, NetEnvelope, PlayerId } from "./multiplayer";
export declare class InMemoryHub {
    private peers;
    register(id: PlayerId, room: string, inbound: (m: NetEnvelope) => void): () => void;
    /** Fan-out a los peers de la MISMA room que el mensaje, menos al emisor. */
    broadcast(from: PlayerId, _room: string, message: NetEnvelope): void;
}
/** Adapter de loopback para tests. Implementa MultiplayerPort contra un InMemoryHub. */
export declare class HeadlessMultiplayerAdapter implements MultiplayerPort {
    private hub;
    readonly selfId: PlayerId;
    private room;
    private connected;
    private unregister;
    private msgHandlers;
    private statusHandlers;
    constructor(hub: InMemoryHub, selfId?: PlayerId);
    connect(opts: ConnectOptions): void;
    disconnect(): void;
    send(message: NetEnvelope): void;
    onMessage(handler: (m: NetEnvelope) => void): () => void;
    onStatus(handler: (s: ConnectionStatus) => void): () => void;
    private emitStatus;
}
//# sourceMappingURL=headlessMultiplayer.d.ts.map