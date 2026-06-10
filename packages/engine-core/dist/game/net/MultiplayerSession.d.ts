import type { GameEvent, GameEventType } from "../events/types";
import type { MultiplayerPort, RoomId } from "../../ports/multiplayer";
import type { PlayerDescriptor } from "./playerIdentity";
import type { RemotePlayersStore } from "./remotePlayersStore";
import { type ThrottleClock } from "./throttle";
import type { OptimisticReconciler } from "./optimistic";
/** Bus mínimo que la sesión necesita (lo cumple el handle de createGameRuntime). */
export interface SessionBus {
    on: (type: GameEventType, handler: (e: GameEvent) => void) => () => void;
    emit: (event: GameEvent) => void;
}
export interface MultiplayerSessionOptions {
    port: MultiplayerPort;
    bus: SessionBus;
    room: RoomId;
    self: PlayerDescriptor;
    remotePlayers: RemotePlayersStore;
    /** Aplica un evento world remoto al estado local (el host lo cablea a los stores). */
    applyRemoteEvent: (event: GameEvent) => void;
    /** Reloj lógico para `ts`. Default Date.now (task 05 puede inyectar HLC). */
    now?: () => number;
    /** ms entre envíos de presence. Default 80 (~12.5 Hz). 0 = sin throttle. */
    presenceThrottleMs?: number;
    /** Reloj/scheduler para el throttle (inyectable en tests). */
    clock?: ThrottleClock;
    /** Reconciliador optimista (task 09) para claim-result/snapshot. */
    reconciler?: OptimisticReconciler;
    /** ms entre heartbeats para jugadores inactivos. Default 30 000 (30 s). 0 = sin heartbeat. */
    heartbeatMs?: number;
}
export interface MultiplayerSession {
    dispose: () => void;
    getSelf: () => PlayerDescriptor;
    /** Actualiza el descriptor local y difunde presence (usado por setName/task 06). */
    updateSelf: (patch: Partial<PlayerDescriptor>) => void;
}
export declare function createMultiplayerSession(opts: MultiplayerSessionOptions): MultiplayerSession;
//# sourceMappingURL=MultiplayerSession.d.ts.map