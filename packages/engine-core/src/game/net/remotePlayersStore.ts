import type { PlayerDescriptor } from "./playerIdentity";
import type { PlayerId } from "../../ports/multiplayer";

export interface RemotePlayersStore {
  /** Inserta o actualiza un jugador remoto (merge parcial sobre el existente). */
  upsert: (descriptor: Partial<PlayerDescriptor> & { playerId: PlayerId }) => void;
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

export function createRemotePlayersStore(): RemotePlayersStore {
  const players = new Map<PlayerId, PlayerDescriptor>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    upsert: (d) => {
      const prev = players.get(d.playerId);
      players.set(d.playerId, {
        playerId: d.playerId,
        displayName: d.displayName ?? prev?.displayName ?? d.playerId,
        characterId: d.characterId ?? prev?.characterId ?? "Dave",
        sceneId: d.sceneId ?? prev?.sceneId ?? "",
        position: d.position ?? prev?.position ?? [0, 0, 0],
        action: d.action ?? prev?.action ?? "idle",
        lastSeenTs: d.lastSeenTs ?? Date.now(),
      });
      notify();
    },
    remove: (id) => {
      if (players.delete(id)) notify();
    },
    getInScene: (sceneId) =>
      [...players.values()].filter((p) => p.sceneId === sceneId),
    getAll: () => [...players.values()],
    pruneStale: (maxAgeMs, now = Date.now()) => {
      const removed: PlayerId[] = [];
      for (const [id, p] of players) {
        if (now - p.lastSeenTs > maxAgeMs) {
          players.delete(id);
          removed.push(id);
        }
      }
      if (removed.length) notify();
      return removed;
    },
    reset: () => {
      players.clear();
      notify();
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
