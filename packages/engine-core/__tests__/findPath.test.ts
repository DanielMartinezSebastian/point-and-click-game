import { describe, expect, it } from "vitest";

import { findPath } from "../src/game/logic/pathfinding/findPath";

describe("findPath", () => {
  const bounds = {
    minX: 0,
    maxX: 10,
    minZ: 0,
    maxZ: 10,
    y: 0,
  };

  it("devuelve ruta directa cuando no hay obstaculos", () => {
    const route = findPath({
      start: { x: 1, z: 1 },
      goal: { x: 9, z: 9 },
      bounds,
      walls: [],
      interactions: [],
      obstaclePadding: 0,
      cellSize: 1,
    });

    expect(route).toEqual([{ x: 9, z: 9 }]);
  });

  it("evita un muro central bloqueante", () => {
    const route = findPath({
      start: { x: 1, z: 5 },
      goal: { x: 9, z: 5 },
      bounds,
      walls: [
        {
          position: [5, 0, 5],
          halfSize: [0.8, 2, 2.2],
          rotationY: 0,
        },
      ],
      interactions: [],
      obstaclePadding: 0.1,
      cellSize: 1,
      segmentSampleStep: 0.2,
    });

    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(1);
    expect(route![route!.length - 1]).toEqual({ x: 9, z: 5 });
    expect(route!.some((point) => point.z !== 5)).toBe(true);
  });

  it("atraviesa un muro con opening suficientemente grande (Phase 6)", () => {
    // Horizontal E-W wall at z=5 blocks N-S movement.
    // Central opening (halfZ wider than wall_halfZ + padding) allows direct traversal.
    // Opening halfZ (0.5) - padding (0.1) = 0.4 > wall halfZ (0.2) + padding (0.1) = 0.3
    // → opening covers the full wall thickness → direct segment is clear.
    const route = findPath({
      start: { x: 5, z: 2 },
      goal: { x: 5, z: 8 },
      bounds,
      walls: [
        {
          position: [5, 0, 5],
          halfSize: [2.5, 2, 0.2], // wide E-W wall, thin in N-S direction
          rotationY: 0,
          openings: [
            {
              id: "door-1",
              position: [0, 0, 0], // centered in wall
              halfSize: [0.8, 2, 0.5], // opening wider than wall thickness + padding
            },
          ],
        },
      ],
      interactions: [],
      obstaclePadding: 0.1,
      cellSize: 0.5,
      segmentSampleStep: 0.1,
    });

    expect(route).not.toBeNull();
    expect(route![route!.length - 1]).toEqual({ x: 5, z: 8 });
  });

  it("mismo muro sin opening bloquea el camino directo (Phase 6)", () => {
    // Same E-W wall, but NO opening → direct path is blocked.
    // Wall spans x=[2.4, 7.6] so agent can go around the ends.
    const route = findPath({
      start: { x: 5, z: 2 },
      goal: { x: 5, z: 8 },
      bounds,
      walls: [
        {
          position: [5, 0, 5],
          halfSize: [2.5, 2, 0.2],
          rotationY: 0,
          // No opening → solid wall
        },
      ],
      interactions: [],
      obstaclePadding: 0.1,
      cellSize: 0.5,
      segmentSampleStep: 0.1,
    });

    // Some path exists (wall doesn't seal the full bounds)
    expect(route).not.toBeNull();
    // Path must detour around the wall — no point should cross z≈5 near x=5
    const goesThrough = route!.some(
      (p) => Math.abs(p.x - 5) <= 0.3 && Math.abs(p.z - 5) <= 0.3,
    );
    expect(goesThrough).toBe(false);
  });

  it("muro sin openings sigue siendo solido (backward compatible, Phase 6)", () => {
    // Existing wall config (no new fields) — behavior unchanged
    const routeAround = findPath({
      start: { x: 1, z: 5 },
      goal: { x: 9, z: 5 },
      bounds,
      walls: [
        {
          position: [5, 0, 5],
          halfSize: [0.8, 2, 2.2],
          rotationY: 0,
          // No openings → solid wall (backward compat)
        },
      ],
      interactions: [],
      obstaclePadding: 0.1,
      cellSize: 1,
      segmentSampleStep: 0.2,
    });

    expect(routeAround).not.toBeNull();
    expect(routeAround!.some((point) => point.z !== 5)).toBe(true);
  });

  it("retorna null cuando inicio y objetivo estan sellados", () => {
    const route = findPath({
      start: { x: 5, z: 5 },
      goal: { x: 8, z: 8 },
      bounds,
      walls: [
        {
          position: [5, 0, 5],
          halfSize: [6, 2, 6],
          rotationY: 0,
        },
      ],
      interactions: [
        {
          position: [8, 0, 8],
          halfSize: [1, 1, 1],
          hasCollision: true,
        },
      ],
      obstaclePadding: 0.5,
      cellSize: 1,
      maxIterations: 200,
    });

    expect(route).toBeNull();
  });

  // Four thin walls enclosing the goal at (8,8) with no opening → the goal's
  // interior cell is open but disconnected from the rest of the grid.
  const sealedRoomWalls = [
    { position: [8, 0, 9] as [number, number, number], halfSize: [1.2, 2, 0.2] as [number, number, number], rotationY: 0 },
    { position: [8, 0, 7] as [number, number, number], halfSize: [1.2, 2, 0.2] as [number, number, number], rotationY: 0 },
    { position: [7, 0, 8] as [number, number, number], halfSize: [0.2, 2, 1.2] as [number, number, number], rotationY: 0 },
    { position: [9, 0, 8] as [number, number, number], halfSize: [0.2, 2, 1.2] as [number, number, number], rotationY: 0 },
  ];

  it("devuelve ruta parcial hacia el objetivo cuando este es inalcanzable", () => {
    // Goal sits inside a sealed room, start is in open space. Instead of
    // freezing (null), findPath should return a partial route that advances the
    // character toward the closest reachable point.
    const route = findPath({
      start: { x: 1, z: 1 },
      goal: { x: 8, z: 8 },
      bounds,
      walls: sealedRoomWalls,
      interactions: [],
      obstaclePadding: 0.2,
      cellSize: 0.4,
      segmentSampleStep: 0.15,
    });

    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(0);
    // The partial route should move the character closer to the goal than it
    // started — i.e. the final point is nearer to (8,8) than (1,1) is.
    const last = route![route!.length - 1];
    const startToGoal = Math.hypot(8 - 1, 8 - 1);
    const lastToGoal = Math.hypot(8 - last.x, 8 - last.z);
    expect(lastToGoal).toBeLessThan(startToGoal);
    // ...but it must NOT reach the sealed interior.
    expect(lastToGoal).toBeGreaterThan(0.5);
  });

  it("respeta allowPartialPath=false devolviendo null si no llega al objetivo", () => {
    const route = findPath({
      start: { x: 1, z: 1 },
      goal: { x: 8, z: 8 },
      bounds,
      walls: sealedRoomWalls,
      interactions: [],
      obstaclePadding: 0.2,
      cellSize: 0.4,
      allowPartialPath: false,
    });

    expect(route).toBeNull();
  });

  it("encuentra un pasillo estrecho entre dos muros", () => {
    // Two walls leave a narrow vertical gap around x=5 (gap width ≈ 1.4).
    // With a fine grid + moderate padding, A* must thread the gap.
    const route = findPath({
      start: { x: 5, z: 1 },
      goal: { x: 5, z: 9 },
      bounds,
      walls: [
        { position: [2.15, 0, 5], halfSize: [2.15, 2, 0.4], rotationY: 0 },
        { position: [7.85, 0, 5], halfSize: [2.15, 2, 0.4], rotationY: 0 },
      ],
      interactions: [],
      obstaclePadding: 0.3,
      cellSize: 0.4,
      segmentSampleStep: 0.15,
    });

    expect(route).not.toBeNull();
    expect(route![route!.length - 1]).toEqual({ x: 5, z: 9 });
  });

  it("explora cuadrículas grandes sin agotar iteraciones (rendimiento del heap)", () => {
    // A large open grid: the binary-heap A* must reach the far corner quickly.
    const bigBounds = { minX: 0, maxX: 60, minZ: 0, maxZ: 60, y: 0 };
    const route = findPath({
      start: { x: 1, z: 1 },
      goal: { x: 59, z: 59 },
      bounds: bigBounds,
      walls: [
        // A central wall to force the grid search (not a trivial direct line).
        { position: [30, 0, 30], halfSize: [0.5, 2, 20], rotationY: 0 },
      ],
      interactions: [],
      obstaclePadding: 0.4,
      cellSize: 0.5,
    });

    expect(route).not.toBeNull();
    expect(route![route!.length - 1]).toEqual({ x: 59, z: 59 });
  });
});

