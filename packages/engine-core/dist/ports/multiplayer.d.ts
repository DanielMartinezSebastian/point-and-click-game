/**
 * MultiplayerPort – contrato agnóstico de transporte multijugador.
 *
 * El core SOLO habla con esta interfaz. Los adapters (PartyKit, headless, …) la
 * implementan fuera del core. Ningún import de red/`window`/proveedor aquí.
 *
 * Ver docs/architecture/09-multiplayer.md §3 y ADR-0008.
 */
/** Identificadores. */
export type PlayerId = string;
export type RoomId = string;
/** Versión del protocolo de red. Súbela ante cambios incompatibles del sobre. */
export declare const NET_PROTOCOL_VERSION = 1;
/** Tipo de carga del sobre. `payload` se interpreta según este discriminador. */
export type NetEnvelopeKind = "command" | "event" | "presence" | "snapshot" | "claim" | "claim-result";
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
export type ConnectionStatus = {
    state: "connecting";
} | {
    state: "connected";
    selfId: PlayerId;
} | {
    state: "disconnected";
    reason?: string;
};
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
//# sourceMappingURL=multiplayer.d.ts.map