import { describe, it, expect } from "vitest";
import { resolveClaim } from "../game/net/claims";

describe("resolveClaim", () => {
  it("exactly one winner for concurrent claims", () => {
    const res = resolveClaim([
      { entityId: "key", by: "A", ts: 5 },
      { entityId: "key", by: "B", ts: 5 }, // same ts → tie-break by id
    ]);
    expect(res.filter((r) => r.granted)).toHaveLength(1);
    expect(res.find((r) => r.granted)!.by).toBe("A");
  });
  it("first writer (lower ts) wins", () => {
    const res = resolveClaim([
      { entityId: "key", by: "A", ts: 9 },
      { entityId: "key", by: "B", ts: 3 },
    ]);
    expect(res.find((r) => r.granted)!.by).toBe("B");
  });
  it("empty input yields no results", () => {
    expect(resolveClaim([])).toEqual([]);
  });
});
