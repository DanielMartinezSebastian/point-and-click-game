import type { PlayerDescriptor } from "./playerIdentity";
import type { PlayerId } from "../../ports/multiplayer";
export interface RemotePlayersStore {
    /** Inserta o actualiza un jugador remoto (merge parcial sobre el existente). */
    upsert: (descriptor: Partial<PlayerDescriptor> & {
        playerId: PlayerId;
    }) => void;
    remove: (playerId: PlayerId) => void;
    /** Solo los jugadores presentes en la escena dada (interest management en el borde). */
    getInScene: (sceneId: string) => PlayerDescriptor[];
    getAll: () => PlayerDescriptor[];
    /** Elimina jugadores sin presence en > maxAgeMs. Devuelve los ids eliminados. */
    pruneStale: (maxAgeMs: number, now?: number) => PlayerId[];
    reset: () => void;
    /** Notifica en cada cambio (para que el renderer re-renderice). */
    subscribe: (listener: () => void) => () => void;
}
export declare function createRemotePlayersStore(): RemotePlayersStore;
//# sourceMappingURL=remotePlayersStore.d.ts.map