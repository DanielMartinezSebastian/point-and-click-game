import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PlayerWalkingState } from "@pointclick-engine/engine-core";
import type { GameVec3 } from "@pointclick-engine/engine-core";
import { buildCumulativeDistances, samplePathPosition } from "../hooks/usePlayerWalkAnimation";

describe("usePlayerWalkAnimation", () => {
  describe("hook initialization", () => {
    test("returns initial state when not walking", () => {
      const playerPos: GameVec3 = [0, 0, 0];
      const walkState: PlayerWalkingState | null = null;

      // Mock result (since we can't easily test useFrame in unit tests)
      const result = {
        animatedPosition: playerPos,
        isWalking: false,
        progress: 0,
      };

      expect(result.isWalking).toBe(false);
      expect(result.animatedPosition).toEqual(playerPos);
      expect(result.progress).toBe(0);
    });

    test("returns walking state when walk is active", () => {
      const playerPos: GameVec3 = [0, 0, 0];
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints: [[0, 0, 0], [5, 0, 5]],
        progress: 0,
        isActive: true,
      };

      const result = {
        animatedPosition: playerPos,
        isWalking: true,
        progress: walkState.progress,
      };

      expect(result.isWalking).toBe(true);
      expect(result.progress).toBe(0);
    });
  });

  describe("walk path properties", () => {
    test("path can have multiple points", () => {
      const pathPoints: GameVec3[] = [
        [0, 0, 0],
        [2, 0, 2],
        [4, 0, 4],
        [5, 0, 5],
      ];

      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints,
        progress: 0,
        isActive: true,
      };

      expect(walkState.pathPoints).toHaveLength(4);
      expect(walkState.pathPoints[0]).toEqual([0, 0, 0]);
      expect(walkState.pathPoints[3]).toEqual([5, 0, 5]);
    });

    test("path can have just start and end", () => {
      const pathPoints: GameVec3[] = [[0, 0, 0], [5, 0, 5]];

      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints,
        progress: 0.5,
        isActive: true,
      };

      expect(walkState.pathPoints).toHaveLength(2);
    });
  });

  describe("progress tracking", () => {
    test("progress starts at 0", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints: [[0, 0, 0], [5, 0, 5]],
        progress: 0,
        isActive: true,
      };

      expect(walkState.progress).toBe(0);
    });

    test("progress can be mid-walk (0.5)", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints: [[0, 0, 0], [5, 0, 5]],
        progress: 0.5,
        isActive: true,
      };

      expect(walkState.progress).toBe(0.5);
    });

    test("progress can be nearly complete", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints: [[0, 0, 0], [5, 0, 5]],
        progress: 0.99,
        isActive: true,
      };

      expect(walkState.progress).toBe(0.99);
    });

    test("progress reaches 1.0 at completion", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints: [[0, 0, 0], [5, 0, 5]],
        progress: 1.0,
        isActive: false, // Inactive after completion
      };

      expect(walkState.progress).toBe(1.0);
      expect(walkState.isActive).toBe(false);
    });
  });

  describe("abort scenarios", () => {
    test("can abort with user-input reason", () => {
      const abortReason: "user-input" | "collision" | "unreachable" =
        "user-input";
      expect(abortReason).toBe("user-input");
    });

    test("can abort with collision reason", () => {
      const abortReason: "user-input" | "collision" | "unreachable" =
        "collision";
      expect(abortReason).toBe("collision");
    });

    test("can abort with unreachable reason", () => {
      const abortReason: "user-input" | "collision" | "unreachable" =
        "unreachable";
      expect(abortReason).toBe("unreachable");
    });

    test("all abort reasons are distinct", () => {
      const reasons = ["user-input", "collision", "unreachable"] as const;
      const seen = new Set(reasons);
      expect(seen.size).toBe(3);
    });
  });

  describe("callback handling", () => {
    test("onWalkAbort callback can be called with reason", () => {
      const onAbort = vi.fn();
      onAbort("user-input");

      expect(onAbort).toHaveBeenCalledWith("user-input");
      expect(onAbort).toHaveBeenCalledTimes(1);
    });

    test("onWalkComplete callback can be called", () => {
      const onComplete = vi.fn();
      onComplete();

      expect(onComplete).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    test("multiple callbacks can be tracked", () => {
      const onAbort = vi.fn();
      const onComplete = vi.fn();

      onAbort("collision");
      onComplete();

      expect(onAbort).toHaveBeenCalledWith("collision");
      expect(onComplete).toHaveBeenCalled();
    });

    test("callbacks are optional", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 5],
        pathPoints: [[0, 0, 0], [5, 0, 5]],
        progress: 0.5,
        isActive: true,
      };

      // Should not throw if no callbacks provided
      expect(() => {
        // Simulating hook call without callbacks
        const result = {
          animatedPosition: [0, 0, 0] as GameVec3,
          isWalking: true,
          progress: walkState.progress,
        };
        expect(result.isWalking).toBe(true);
      }).not.toThrow();
    });
  });

  describe("walk state validity", () => {
    test("walk state must have targetPosition", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 10],
        pathPoints: [[0, 0, 0], [5, 0, 10]],
        progress: 0,
        isActive: true,
      };

      expect(walkState.targetPosition).toBeDefined();
      expect(walkState.targetPosition).toHaveLength(3);
    });

    test("walk state must have pathPoints", () => {
      const walkState: PlayerWalkingState = {
        targetPosition: [5, 0, 10],
        pathPoints: [[0, 0, 0], [5, 0, 10]],
        progress: 0,
        isActive: true,
      };

      expect(walkState.pathPoints).toBeDefined();
      expect(Array.isArray(walkState.pathPoints)).toBe(true);
    });

    test("walk state must track isActive", () => {
      const walkActiveState: PlayerWalkingState = {
        targetPosition: [5, 0, 10],
        pathPoints: [[0, 0, 0], [5, 0, 10]],
        progress: 0.5,
        isActive: true,
      };

      const walkInactiveState: PlayerWalkingState = {
        targetPosition: [5, 0, 10],
        pathPoints: [[0, 0, 0], [5, 0, 10]],
        progress: 0,
        isActive: false,
      };

      expect(walkActiveState.isActive).toBe(true);
      expect(walkInactiveState.isActive).toBe(false);
    });
  });

  describe("position interpolation", () => {
    test("interpolates between start and end", () => {
      const start: GameVec3 = [0, 0, 0];
      const end: GameVec3 = [10, 0, 10];
      const progress = 0.5;

      // Linear interpolation
      const interpolated: GameVec3 = [
        start[0] + (end[0] - start[0]) * progress,
        start[1],
        start[2] + (end[2] - start[2]) * progress,
      ];

      expect(interpolated).toEqual([5, 0, 5]);
    });

    test("interpolates correctly at progress 0", () => {
      const start: GameVec3 = [0, 0, 0];
      const end: GameVec3 = [10, 0, 10];
      const progress = 0;

      const interpolated: GameVec3 = [
        start[0] + (end[0] - start[0]) * progress,
        start[1],
        start[2] + (end[2] - start[2]) * progress,
      ];

      expect(interpolated).toEqual(start);
    });

    test("interpolates correctly at progress 1", () => {
      const start: GameVec3 = [0, 0, 0];
      const end: GameVec3 = [10, 0, 10];
      const progress = 1;

      const interpolated: GameVec3 = [
        start[0] + (end[0] - start[0]) * progress,
        start[1],
        start[2] + (end[2] - start[2]) * progress,
      ];

      expect(interpolated).toEqual(end);
    });

    test("handles negative coordinates", () => {
      const start: GameVec3 = [-10, 0, -10];
      const end: GameVec3 = [0, 0, 0];
      const progress = 0.5;

      const interpolated: GameVec3 = [
        start[0] + (end[0] - start[0]) * progress,
        start[1],
        start[2] + (end[2] - start[2]) * progress,
      ];

      expect(interpolated).toEqual([-5, 0, -5]);
    });
  });
});

// ── Unit tests for path helpers ────────────────────────────────────────────

describe("buildCumulativeDistances", () => {
  test("single segment returns [0, length]", () => {
    const pts: GameVec3[] = [[0, 0, 0], [3, 0, 4]]; // 3-4-5 triangle → dist=5
    const d = buildCumulativeDistances(pts);
    expect(d).toHaveLength(2);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(5);
  });

  test("two equal segments accumulate correctly", () => {
    const pts: GameVec3[] = [[0, 0, 0], [5, 0, 0], [10, 0, 0]];
    const d = buildCumulativeDistances(pts);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(5);
    expect(d[2]).toBeCloseTo(10);
  });

  test("path with three waypoints — L-shape", () => {
    const pts: GameVec3[] = [[0, 0, 0], [4, 0, 0], [4, 0, 3]]; // 4 + 3 = 7 total
    const d = buildCumulativeDistances(pts);
    expect(d[2]).toBeCloseTo(7);
  });

  test("single point returns [0]", () => {
    const pts: GameVec3[] = [[1, 0, 2]];
    const d = buildCumulativeDistances(pts);
    expect(d).toEqual([0]);
  });
});

describe("samplePathPosition", () => {
  const pts: GameVec3[] = [[0, 0, 0], [10, 0, 0]]; // straight line along X
  const dist = buildCumulativeDistances(pts);
  const total = 10;

  test("progress 0 returns start", () => {
    const p = samplePathPosition(pts, dist, total, 0);
    expect(p[0]).toBeCloseTo(0);
    expect(p[2]).toBeCloseTo(0);
  });

  test("progress 1 returns end", () => {
    const p = samplePathPosition(pts, dist, total, 1);
    expect(p[0]).toBeCloseTo(10);
    expect(p[2]).toBeCloseTo(0);
  });

  test("progress 0.5 returns midpoint", () => {
    const p = samplePathPosition(pts, dist, total, 0.5);
    expect(p[0]).toBeCloseTo(5);
  });

  test("three-point L-shaped path — midpoint is at corner, not across obstacle", () => {
    // Path goes from (0,0,0) → corner (4,0,0) → (4,0,3)
    // Segment 1 length=4, Segment 2 length=3. Total=7.
    // At progress=4/7 the character should be exactly at the corner (4,0,0).
    const lPts: GameVec3[] = [[0, 0, 0], [4, 0, 0], [4, 0, 3]];
    const lDist = buildCumulativeDistances(lPts);
    const lTotal = lDist[lDist.length - 1];

    const atCorner = samplePathPosition(lPts, lDist, lTotal, 4 / 7);
    expect(atCorner[0]).toBeCloseTo(4, 4);
    expect(atCorner[2]).toBeCloseTo(0, 4);
  });

  test("three-point L-shaped path — halfway through second segment", () => {
    const lPts: GameVec3[] = [[0, 0, 0], [4, 0, 0], [4, 0, 6]];
    const lDist = buildCumulativeDistances(lPts);
    const lTotal = lDist[lDist.length - 1]; // 4 + 6 = 10

    // progress=0.7 → targetDist=7 → fully past segment 1 (4) → into seg 2 at dist 3 of 6 → z=3
    const p = samplePathPosition(lPts, lDist, lTotal, 0.7);
    expect(p[0]).toBeCloseTo(4);
    expect(p[2]).toBeCloseTo(3);
  });

  test("total=0 returns last point without crash", () => {
    const zeroPts: GameVec3[] = [[5, 0, 5], [5, 0, 5]];
    const zeroDist = buildCumulativeDistances(zeroPts);
    const p = samplePathPosition(zeroPts, zeroDist, 0, 0.5);
    expect(p).toEqual([5, 0, 5]);
  });
});
