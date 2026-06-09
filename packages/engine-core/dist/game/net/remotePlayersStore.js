export function createRemotePlayersStore() {
    const players = new Map();
    const listeners = new Set();
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
            if (players.delete(id))
                notify();
        },
        getInScene: (sceneId) => [...players.values()].filter((p) => p.sceneId === sceneId),
        getAll: () => [...players.values()],
        pruneStale: (maxAgeMs, now = Date.now()) => {
            const removed = [];
            for (const [id, p] of players) {
                if (now - p.lastSeenTs > maxAgeMs) {
                    players.delete(id);
                    removed.push(id);
                }
            }
            if (removed.length)
                notify();
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
//# sourceMappingURL=remotePlayersStore.js.map