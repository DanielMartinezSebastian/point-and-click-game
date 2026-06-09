import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from "./roomCode";
import { createRoomCodeStorage } from "./roomCodeStorage";
import type { StoragePort } from "../platform-web";

export const MAX_PLAYERS = 4;

export interface RoomSession {
  /** Código activo (null si aún no se ha creado/unido). */
  getCode: () => string | null;
  /** Crea una room nueva (genera código), la persiste y la devuelve. */
  create: () => string;
  /** Une a un código existente (valida + persiste). Lanza si inválido. */
  join: (code: string) => string;
  /** Reset: nueva room vacía (solo-play hasta que entre alguien). */
  reset: () => string;
  /** Olvida el código persistido (empezar limpio). */
  forget: () => void;
  /** Restaura el último código guardado, si existe. */
  restore: () => string | null;
  capacity: number;
  isFull: (remoteCount: number) => boolean;
  freeSlots: (remoteCount: number) => number;
}

export function createRoomSession(
  storage: StoragePort,
  rng: () => number = Math.random,
): RoomSession {
  const persist = createRoomCodeStorage(storage);
  let code: string | null = null;
  const setCode = (c: string) => {
    code = c;
    persist.save(c);
    return c;
  };
  return {
    getCode: () => code,
    create: () => setCode(generateRoomCode(rng)),
    join: (raw) => {
      const c = normalizeRoomCode(raw);
      if (!isValidRoomCode(c)) throw new Error(`código inválido: ${raw}`);
      return setCode(c);
    },
    reset: () => setCode(generateRoomCode(rng)),
    forget: () => {
      code = null;
      persist.clear();
    },
    restore: () => {
      code = persist.load();
      return code;
    },
    capacity: MAX_PLAYERS,
    // remoteCount = otros jugadores; +1 = yo
    isFull: (remoteCount) => remoteCount + 1 >= MAX_PLAYERS,
    freeSlots: (remoteCount) => Math.max(0, MAX_PLAYERS - (remoteCount + 1)),
  };
}
