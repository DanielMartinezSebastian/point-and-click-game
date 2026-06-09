import type { GameVec3 } from "../types";
import type { PlayerId } from "../../ports/multiplayer";

/** Personaje seleccionable. Hoy solo "Dave"; reservado para multi-character futuro. */
export type CharacterId = "Dave";
export const DEFAULT_CHARACTER_ID: CharacterId = "Dave";

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

const NAME_PREFIXES = [
  "Viajero",
  "Errante",
  "Nómada",
  "Curioso",
  "Vecino",
  "Explorador",
] as const;

/** Genera un nombre anónimo legible, p.ej. "Viajero-A3F". RNG inyectable para tests. */
export function generateRandomName(rng: () => number = Math.random): string {
  const prefix = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)]!;
  const suffix = Math.floor(rng() * 0xfff)
    .toString(16)
    .toUpperCase()
    .padStart(3, "0");
  return `${prefix}-${suffix}`;
}

/** Crea el descriptor inicial del jugador local. */
export function createSelfDescriptor(opts: {
  playerId: PlayerId;
  sceneId: string;
  position: GameVec3;
  displayName?: string;
  characterId?: CharacterId;
  now?: () => number;
}): PlayerDescriptor {
  return {
    playerId: opts.playerId,
    displayName: opts.displayName ?? generateRandomName(),
    characterId: opts.characterId ?? DEFAULT_CHARACTER_ID,
    sceneId: opts.sceneId,
    position: opts.position,
    action: "idle",
    lastSeenTs: (opts.now ?? Date.now)(),
  };
}
