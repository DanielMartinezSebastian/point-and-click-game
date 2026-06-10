import { describe, it, expect, vi } from "vitest";
import { throttleTrailing } from "../game/net/throttle";

describe("throttleTrailing", () => {
  it("runs immediately then coalesces, flushing the last call", () => {
    let t = 0;
    const scheduled: Array<{ cb: () => void; at: number }> = [];
    const clock = {
      now: () => t,
      schedule: (cb: () => void, d: number) => scheduled.push({ cb, at: t + d }),
    };
    const fn = vi.fn();
    const throttled = throttleTrailing(fn, 100, clock);
    throttled(); // t=0 → runs (1)
    t = 30;
    throttled(); // within window → schedules trailing
    t = 60;
    throttled(); // still within → already scheduled
    expect(fn).toHaveBeenCalledTimes(1);
    t = 100;
    scheduled.forEach((s) => s.cb()); // flush trailing
    expect(fn).toHaveBeenCalledTimes(2); // last call flushed
  });
});
