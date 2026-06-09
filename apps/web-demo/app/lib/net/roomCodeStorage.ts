import type { StoragePort } from "../platform-web";

export const ROOM_CODE_STORAGE_KEY = "pce:multiplayer:roomCode";

/** Persiste el último código de room (reutilizable al volver). */
export function createRoomCodeStorage(storage: StoragePort) {
  return {
    load: (): string | null => storage.getItem(ROOM_CODE_STORAGE_KEY),
    save: (code: string): void => storage.setItem(ROOM_CODE_STORAGE_KEY, code),
    clear: (): void => storage.removeItem(ROOM_CODE_STORAGE_KEY),
  };
}
