import { describe, it, expect } from "vitest";
import { WorldStateLww } from "../game/net/worldState";
import { Hlc } from "../game/net/clock";

describe("WorldStateLww", () => {
  it("keeps the higher ts", () => {
    const w = new WorldStateLww();
    expect(w.merge("door1", "open", { value: false, ts: 1, by: "A" })).toBe(true);
    expect(w.merge("door1", "open", { value: true, ts: 2, by: "B" })).toBe(true);
    expect(w.merge("door1", "open", { value: false, ts: 1, by: "C" })).toBe(false);
    expect(w.get("door1", "open")).toBe(true);
  });
  it("round-trips via snapshot/load", () => {
    const w = new WorldStateLww();
    w.merge("door1", "open", { value: true, ts: 5, by: "A" });
    const w2 = new WorldStateLww();
    w2.load(w.snapshot());
    expect(w2.get("door1", "open")).toBe(true);
  });
  it("Hlc is monotonic even within the same wall ms", () => {
    const hlc = new Hlc();
    const a = hlc.now(1000);
    const b = hlc.now(1000);
    const c = hlc.now(1000);
    expect(a < b && b < c).toBe(true);
  });
});
