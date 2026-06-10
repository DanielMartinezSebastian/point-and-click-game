import { describe, it, expect, vi } from "vitest";
import {
  HeadlessMultiplayerAdapter,
  InMemoryHub,
} from "../ports/headlessMultiplayer";
import { NET_PROTOCOL_VERSION, type NetEnvelope } from "../ports/multiplayer";

const env = (from: string, room = "r1"): NetEnvelope => ({
  v: NET_PROTOCOL_VERSION,
  room,
  from,
  ts: 1,
  kind: "event",
  payload: { type: "ping" },
});

describe("MultiplayerPort headless", () => {
  it("delivers a sent message to peers but not to self", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const b = new HeadlessMultiplayerAdapter(hub, "B");
    a.connect({ room: "r1" });
    b.connect({ room: "r1" });
    const aSeen = vi.fn();
    const bSeen = vi.fn();
    a.onMessage(aSeen);
    b.onMessage(bSeen);
    a.send(env("A"));
    expect(bSeen).toHaveBeenCalledTimes(1);
    expect(aSeen).not.toHaveBeenCalled();
  });

  it("does not deliver across different rooms", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const b = new HeadlessMultiplayerAdapter(hub, "B");
    a.connect({ room: "r1" });
    b.connect({ room: "r2" });
    const bSeen = vi.fn();
    b.onMessage(bSeen);
    a.send(env("A", "r1"));
    expect(bSeen).not.toHaveBeenCalled();
  });

  it("reports connected/disconnected status", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const seen: string[] = [];
    a.onStatus((s) => seen.push(s.state));
    a.connect({ room: "r1" });
    a.disconnect();
    expect(seen).toEqual(["connected", "disconnected"]);
  });

  it("stops receiving after disconnect", () => {
    const hub = new InMemoryHub();
    const a = new HeadlessMultiplayerAdapter(hub, "A");
    const b = new HeadlessMultiplayerAdapter(hub, "B");
    a.connect({ room: "r1" });
    b.connect({ room: "r1" });
    const bSeen = vi.fn();
    b.onMessage(bSeen);
    b.disconnect();
    a.send(env("A"));
    expect(bSeen).not.toHaveBeenCalled();
  });
});
