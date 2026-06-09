import { describe, it, expect } from "vitest";
import { InMemoryHub, HeadlessMultiplayerAdapter } from "../ports/headlessMultiplayer";
import { createMultiplayerSession } from "../game/net/MultiplayerSession";
import { createRemotePlayersStore } from "../game/net/remotePlayersStore";
import { createSelfDescriptor } from "../game/net/playerIdentity";
import type { GameEvent, GameEventType } from "../game/events/types";

// Bus de test: registro por tipo + emit que invoca a los listeners de ese tipo.
function makeBus() {
  const map = new Map<GameEventType, Array<(e: GameEvent) => void>>();
  return {
    on: (t: GameEventType, h: (e: GameEvent) => void) => {
      const arr = map.get(t) ?? [];
      arr.push(h);
      map.set(t, arr);
      return () => map.set(t, (map.get(t) ?? []).filter((x) => x !== h));
    },
    emit: (e: GameEvent) => (map.get(e.type) ?? []).forEach((h) => h(e)),
  };
}

function peer(hub: InMemoryHub, id: string, applied: GameEvent[]) {
  const bus = makeBus();
  const remotePlayers = createRemotePlayersStore();
  const session = createMultiplayerSession({
    port: new HeadlessMultiplayerAdapter(hub, id),
    bus,
    room: "r1",
    remotePlayers,
    self: createSelfDescriptor({
      playerId: id,
      sceneId: "town",
      position: [0, 0, 0],
      displayName: id,
    }),
    applyRemoteEvent: (e) => {
      applied.push(e);
      bus.emit(e);
    }, // re-emite al bus local
    now: () => 1,
    presenceThrottleMs: 0, // sin throttle para tests deterministas
  });
  return { bus, remotePlayers, session };
}

describe("MultiplayerSession", () => {
  it("replicates a world event to the other peer", () => {
    const hub = new InMemoryHub();
    const appliedB: GameEvent[] = [];
    const a = peer(hub, "A", []);
    peer(hub, "B", appliedB);
    a.bus.emit({ type: "item:dropped", itemId: "key", outcome: "place" });
    expect(appliedB).toContainEqual({
      type: "item:dropped",
      itemId: "key",
      outcome: "place",
    });
  });

  it("does NOT replicate a private event", () => {
    const hub = new InMemoryHub();
    const appliedB: GameEvent[] = [];
    const a = peer(hub, "A", []);
    peer(hub, "B", appliedB);
    a.bus.emit({ type: "dialog:triggered", text: "hi", source: "test" });
    expect(appliedB).toHaveLength(0);
  });

  it("does not echo a remote-applied event back to the wire", () => {
    const hub = new InMemoryHub();
    const appliedA: GameEvent[] = [];
    const appliedB: GameEvent[] = [];
    const a = peer(hub, "A", appliedA);
    peer(hub, "B", appliedB);
    a.bus.emit({ type: "item:dropped", itemId: "key", outcome: "place" });
    expect(appliedB.filter((e) => e.type === "item:dropped")).toHaveLength(1);
    expect(appliedA.filter((e) => e.type === "item:dropped")).toHaveLength(0);
  });

  it("upserts remote presence and emits net:playerJoined", () => {
    const hub = new InMemoryHub();
    const joined: GameEvent[] = [];
    const a = peer(hub, "A", []);
    a.bus.on("net:playerJoined", (e) => joined.push(e));
    peer(hub, "B", []); // B se conecta → manda presence
    expect(
      a.remotePlayers.getInScene("town").some((p) => p.playerId === "B"),
    ).toBe(true);
    expect(joined.some((e) => e.type === "net:playerJoined")).toBe(true);
  });

  it("propagates presence position via player:moved", () => {
    const hub = new InMemoryHub();
    const a = peer(hub, "A", []);
    const b = peer(hub, "B", []);
    b.bus.emit({ type: "player:moved", position: [5, 0, 7], action: "east" });
    const bOnA = a.remotePlayers.getInScene("town").find((p) => p.playerId === "B");
    expect(bOnA?.position).toEqual([5, 0, 7]);
    expect(bOnA?.action).toBe("east");
  });
});
