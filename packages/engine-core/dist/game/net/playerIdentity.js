export const DEFAULT_CHARACTER_ID = "Dave";
const NAME_PREFIXES = [
    "Viajero",
    "Errante",
    "Nómada",
    "Curioso",
    "Vecino",
    "Explorador",
];
/** Genera un nombre anónimo legible, p.ej. "Viajero-A3F". RNG inyectable para tests. */
export function generateRandomName(rng = Math.random) {
    const prefix = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)];
    const suffix = Math.floor(rng() * 0xfff)
        .toString(16)
        .toUpperCase()
        .padStart(3, "0");
    return `${prefix}-${suffix}`;
}
/** Crea el descriptor inicial del jugador local. */
export function createSelfDescriptor(opts) {
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
//# sourceMappingURL=playerIdentity.js.map