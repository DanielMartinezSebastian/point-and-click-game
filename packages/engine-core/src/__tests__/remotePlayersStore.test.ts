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
  it("notifies subscribers on change", () => {
    const s = createRemotePlayersStore();
    let n = 0;
    const unsub = s.subscribe(() => n++);
    s.upsert({ playerId: "B", sceneId: "town" });
    s.remove("B");
    unsub();
    s.upsert({ playerId: "C", sceneId: "town" });
    expect(n).toBe(2);
  });
  it("generateRandomName is deterministic with injected rng", () => {
    expect(generateRandomName(() => 0)).toMatch(/^Viajero-000$/);
  });
});
