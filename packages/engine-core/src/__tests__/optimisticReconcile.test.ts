import { describe, it, expect, vi } from "vitest";
import { createOptimisticReconciler } from "../game/net/optimistic";

describe("optimistic reconciler", () => {
  it("confirm does not roll back", () => {
    const r = createOptimisticReconciler();
    const rollback = vi.fn();
    r.track("key", rollback);
    r.confirm("key");
    expect(rollback).not.toHaveBeenCalled();
    expect(r.size()).toBe(0);
  });
  it("reject rolls back exactly once", () => {
    const r = createOptimisticReconciler();
    const rollback = vi.fn();
    r.track("key", rollback);
    r.reject("key");
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(r.size()).toBe(0);
  });
  it("onSnapshot reverts all unconfirmed predictions", () => {
    const r = createOptimisticReconciler();
    const a = vi.fn();
    const b = vi.fn();
    r.track("k1", a);
    r.track("k2", b);
    r.onSnapshot();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(r.size()).toBe(0);
  });
});
