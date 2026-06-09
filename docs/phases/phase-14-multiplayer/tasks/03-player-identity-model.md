# Task 03-player-identity-model

**Effort**: 0.5 day | **Blocks**: 04,07,10 | **Blocked by**: 01

---

## 🎯 Objetivo

Modelo de identidad (`PlayerDescriptor` con `characterId` reservado y nombre anónimo aleatorio
cambiable) + store agnóstico de jugadores remotos (presence).

---

## 📁 Archivos

- **CREAR** `packages/engine-core/src/game/net/playerIdentity.ts`
- **CREAR** `packages/engine-core/src/game/net/remotePlayersStore.ts`
- **CREAR** `packages/engine-core/src/__tests__/remotePlayersStore.test.ts`
- **EDITAR** `packages/engine-core/src/game/net/index.ts` (re-export)

---

## ✅ Success Criteria

- [ ] `PlayerDescriptor`, `CharacterId`, `DEFAULT_CHARACTER_ID`, `generateRandomName`, `createSelfDescriptor`
- [ ] `createRemotePlayersStore()` con `upsert/remove/getInScene/getAll/reset/pruneStale`
- [ ] Nombre aleatorio determinista-testeable (acepta RNG inyectable)
- [ ] Tests verdes
- [ ] Exportado

---

## 📝 Step 1 — `game/net/playerIdentity.ts`

```ts
import type { GameVec3 } from "../types";
import type { PlayerId } from "../../ports/multiplayer";

export type { PlayerId } from "../../ports/multiplayer";

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

const NAME_PREFIXES = ["Viajero", "Errante", "Nómada", "Curioso", "Vecino", "Explorador"] as const;

/** Genera un nombre anónimo legible, p.ej. "Viajero-A3F". RNG inyectable para tests. */
export function generateRandomName(rng: () => number = Math.random): string {
  const prefix = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)]!;
  const suffix = Math.floor(rng() * 0xfff).toString(16).toUpperCase().padStart(3, "0");
  return `${prefix}-${suffix}`;
}

/** Crea el descriptor inicial del jugador local. */
export function createSelfDescriptor(opts: {
  playerId: PlayerId;
  sceneId: string;
  position: GameVec3;
  displayName?: string;
  characterId?: CharacterId;
}): PlayerDescriptor {
  return {
    playerId: opts.playerId,
    displayName: opts.displayName ?? generateRandomName(),
    characterId: opts.characterId ?? DEFAULT_CHARACTER_ID,
    sceneId: opts.sceneId,
    position: opts.position,
    action: "idle",
    lastSeenTs: Date.now(),
  };
}
```

## 📝 Step 2 — `game/net/remotePlayersStore.ts`

```ts
import type { PlayerDescriptor, PlayerId } from "./playerIdentity";

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
    remove: (id) => { if (players.delete(id)) notify(); },
    getInScene: (sceneId) =>
      [...players.values()].filter((p) => p.sceneId === sceneId),
    getAll: () => [...players.values()],
    pruneStale: (maxAgeMs, now = Date.now()) => {
      const removed: PlayerId[] = [];
      for (const [id, p] of players) {
        if (now - p.lastSeenTs > maxAgeMs) { players.delete(id); removed.push(id); }
      }
      if (removed.length) notify();
      return removed;
    },
    reset: () => { players.clear(); notify(); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}
```

## 📝 Step 3 — export
En `game/net/index.ts` añade:
```ts
export * from "./playerIdentity";
export * from "./remotePlayersStore";
```

## 📝 Step 4 — Test `__tests__/remotePlayersStore.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { createRemotePlayersStore } from "../game/net/remotePlayersStore";
import { generateRandomName } from "../game/net/playerIdentity";

describe("remotePlayersStore", () => {
  it("upsert merges partials and filters by scene", () => {
    const s = createRemotePlayersStore();
    s.upsert({ playerId: "B", sceneId: "town", position: [1, 0, 2] });
    s.upsert({ playerId: "C", sceneId: "cave", position: [0, 0, 0] });
    expect(s.getInScene("town").map((p) => p.playerId)).toEqual(["B"]);
    s.upsert({ playerId: "B", position: [3, 0, 4] }); // keeps sceneId=town
    expect(s.getInScene("town")[0]!.position).toEqual([3, 0, 4]);
  });
  it("pruneStale removes old players", () => {
    const s = createRemotePlayersStore();
    s.upsert({ playerId: "B", sceneId: "town", lastSeenTs: 1000 });
    expect(s.pruneStale(500, 2000)).toEqual(["B"]);
    expect(s.getAll()).toHaveLength(0);
  });
  it("generateRandomName is deterministic with injected rng", () => {
    expect(generateRandomName(() => 0)).toMatch(/^Viajero-000$/);
  });
});
```

## ✅ Verificación
`npm test -w packages/engine-core` verde.

## 📚 References
- `packages/engine-core/src/game/state/placedItemsStore.ts` (patrón store factory agnóstico)
- `docs/architecture/09-multiplayer.md` §6–§7
