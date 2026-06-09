import type { GameVec3 } from "../types";
import type { PlayerId } from "../../ports/multiplayer";
/** Personaje seleccionable. Hoy solo "Dave"; reservado para multi-character futuro. */
export type CharacterId = "Dave";
export declare const DEFAULT_CHARACTER_ID: CharacterId;
export type PlayerAction = "idle" | "north" | "south" | "west" | "east";
/** Descriptor de un jugador. Serializable: viaja como presence en NetEnvelope.payload. */
export interface PlayerDescriptor {
    playerId: PlayerId;
    displayName: string;
    characterId: CharacterId;
    sceneId: string;
    position: GameVec3;
    action: PlayerAction;
    /** Último timestamp visto (para limpiar jugadores stale). */
    lastSeenTs: number;
}
/** Genera un nombre anónimo legible, p.ej. "Viajero-A3F". RNG inyectable para tests. */
export declare function generateRandomName(rng?: () => number): string;
/** Crea el descriptor inicial del jugador local. */
export declare function createSelfDescriptor(opts: {
    playerId: PlayerId;
    sceneId: string;
    position: GameVec3;
    displayName?: string;
    characterId?: CharacterId;
    now?: () => number;
}): PlayerDescriptor;
//# sourceMappingURL=playerIdentity.d.ts.map