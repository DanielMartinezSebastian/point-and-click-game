import { describe, it, expect } from "vitest";
import type { MovementPoint } from "@pointclick-engine/engine-core";

// Pure direction-calculation logic extracted for unit testing.
// This mirrors the algorithm in useClickToMoveController without React refs.

type Config = { arrivalThreshold: number; stuckMovementEpsilon: number; stuckTimeoutMs: number };
const DEFAULT: Config = { arrivalThreshold: 0.15, stuckMovementEpsilon: 0.015, stuckTimeoutMs: 550 };

function resolveDir(
  route: MovementPoint[],
  target: MovementPoint | null,
  currentX: number,
  currentZ: number,
  cfg: Config = DEFAULT,
): { horizontal: number; vertical: number; snapToTarget?: MovementPoint; remainingRoute: MovementPoint[] } {
  const r = [...route];

  while (r.length > 0) {
    const next = r[0]!;
    const dx = next.x - currentX;
    const dz = next.z - currentZ;
    if (Math.sqrt(dx * dx + dz * dz) < cfg.arrivalThreshold) {
      r.shift();
    } else {
      break;
    }
  }

  const t = r[0] ?? target;
  if (!t) return { horizontal: 0, vertical: 0, remainingRoute: r };

  const dx = t.x - currentX;
  const dz = t.z - currentZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < cfg.arrivalThreshold) {
    if (r.length > 0) r.shift();
    if (r.length === 0) {
      return { horizontal: 0, vertical: 0, snapToTarget: t, remainingRoute: r };
    }
    return { horizontal: 0, vertical: 0, remainingRoute: r };
  }

  return {
    horizontal: Math.max(-1, Math.min(1, dx / dist)),
    vertical: Math.max(-1, Math.min(1, dz / dist)),
    remainingRoute: r,
  };
}

function calcStuck(
  prevStuckMs: number,
  prevX: number,
  prevZ: number,
  currentX: number,
  currentZ: number,
  delta: number,
  cfg: Config = DEFAULT,
): { stuck: boolean; nextStuckMs: number } {
  const moved = Math.sqrt((currentX - prevX) ** 2 + (currentZ - prevZ) ** 2);
  if (moved < cfg.stuckMovementEpsilon) {
    const nextStuckMs = prevStuckMs + delta * 1000;
    return { stuck: nextStuckMs > cfg.stuckTimeoutMs, nextStuckMs };
  }
  return { stuck: false, nextStuckMs: 0 };
}

describe("useClickToMoveController — direction logic", () => {
  it("sin ruta ni target devuelve vector cero", () => {
    const dir = resolveDir([], null, 0, 0);
    expect(dir.horizontal).toBe(0);
    expect(dir.vertical).toBe(0);
  });

  it("con target a la derecha produce horizontal positivo", () => {
    const dir = resolveDir([], { x: 10, z: 0 }, 0, 0);
    expect(dir.horizontal).toBeGreaterThan(0);
    expect(dir.vertical).toBe(0);
  });

  it("con target por delante (z+) produce vertical positivo", () => {
    const dir = resolveDir([], { x: 0, z: 10 }, 0, 0);
    expect(dir.horizontal).toBe(0);
    expect(dir.vertical).toBeGreaterThan(0);
  });

  it("vector normalizado — módulo máximo 1", () => {
    const dir = resolveDir([], { x: 7, z: 7 }, 0, 0);
    const mag = Math.sqrt(dir.horizontal ** 2 + dir.vertical ** 2);
    expect(mag).toBeCloseTo(1, 3);
  });

  it("cuando el player está dentro del arrivalThreshold devuelve snapToTarget", () => {
    const cfg = { ...DEFAULT, arrivalThreshold: 0.5 };
    const dir = resolveDir([], { x: 0.3, z: 0 }, 0, 0, cfg);
    expect(dir.snapToTarget).toBeDefined();
    expect(dir.snapToTarget?.x).toBe(0.3);
  });

  it("ruta con múltiples waypoints — avanza al siguiente cuando se llega al actual", () => {
    const route: MovementPoint[] = [{ x: 0, z: 0 }, { x: 5, z: 0 }];
    // Ya está en el primero (dist < threshold) → debe avanzar al segundo
    const dir = resolveDir(route, null, 0, 0);
    expect(dir.horizontal).toBeGreaterThan(0); // apunta hacia x=5
  });
});

describe("useClickToMoveController — stuck detection", () => {
  it("no stuck cuando el player se mueve suficiente", () => {
    const result = calcStuck(0, 0, 0, 1, 0, 0.016);
    expect(result.stuck).toBe(false);
    expect(result.nextStuckMs).toBe(0);
  });

  it("acumula stuckMs cuando el movimiento es menor que epsilon", () => {
    const result = calcStuck(0, 0, 0, 0.001, 0, 0.016);
    expect(result.stuck).toBe(false);
    expect(result.nextStuckMs).toBeGreaterThan(0);
  });

  it("reporta stuck cuando stuckMs supera el timeout", () => {
    const cfg = { ...DEFAULT, stuckTimeoutMs: 100 };
    // Simular frames acumulados: empieza con 90 ms ya acumulados
    const result = calcStuck(90, 0, 0, 0.001, 0, 0.016, cfg); // +16 ms = 106 ms > 100
    expect(result.stuck).toBe(true);
  });
});

// Mirror of the slide-assist logic added to useClickToMoveController for unit
// testing without React refs.
const SLIDE_TRIGGER_MS_TEST = 150;

function resolveDirWithSlide(
  route: MovementPoint[],
  target: MovementPoint | null,
  currentX: number,
  currentZ: number,
  stuckMs: number,
  slideSign: 1 | -1 = 1,
  cfg: Config = DEFAULT,
): { horizontal: number; vertical: number } {
  const r = [...route];

  while (r.length > 0) {
    const next = r[0]!;
    const dx = next.x - currentX;
    const dz = next.z - currentZ;
    if (Math.sqrt(dx * dx + dz * dz) < cfg.arrivalThreshold) {
      r.shift();
    } else {
      break;
    }
  }

  const t = r[0] ?? target;
  if (!t) return { horizontal: 0, vertical: 0 };

  const dx = t.x - currentX;
  const dz = t.z - currentZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < cfg.arrivalThreshold) return { horizontal: 0, vertical: 0 };

  if (stuckMs >= SLIDE_TRIGGER_MS_TEST) {
    const perpX = (-dz / dist) * slideSign;
    const perpZ = (dx / dist) * slideSign;
    const blend = Math.min((stuckMs - SLIDE_TRIGGER_MS_TEST) / 200, 0.85);
    return {
      horizontal: Math.max(-1, Math.min(1, dx / dist * (1 - blend) + perpX * blend)),
      vertical: Math.max(-1, Math.min(1, dz / dist * (1 - blend) + perpZ * blend)),
    };
  }

  return {
    horizontal: Math.max(-1, Math.min(1, dx / dist)),
    vertical: Math.max(-1, Math.min(1, dz / dist)),
  };
}

describe("useClickToMoveController — slide assist", () => {
  it("sin tiempo atascado la dirección apunta directamente al target", () => {
    const dir = resolveDirWithSlide([], { x: 10, z: 0 }, 0, 0, 0);
    expect(dir.horizontal).toBeCloseTo(1, 3);
    expect(dir.vertical).toBeCloseTo(0, 3);
  });

  it("con stuckMs < SLIDE_TRIGGER_MS la dirección es idéntica a la directa", () => {
    const direct = resolveDirWithSlide([], { x: 5, z: 5 }, 0, 0, 0);
    const almostTrigger = resolveDirWithSlide([], { x: 5, z: 5 }, 0, 0, 100);
    expect(almostTrigger.horizontal).toBeCloseTo(direct.horizontal, 3);
    expect(almostTrigger.vertical).toBeCloseTo(direct.vertical, 3);
  });

  it("con stuckMs >= SLIDE_TRIGGER_MS se añade componente perpendicular", () => {
    // Target to the right (x+), perpendicular should be z-axis component
    const dir = resolveDirWithSlide([], { x: 10, z: 0 }, 0, 0, 200, 1);
    // Direction should deviate from pure horizontal
    expect(Math.abs(dir.vertical)).toBeGreaterThan(0);
  });

  it("slideSign=-1 produce componente perpendicular opuesta", () => {
    const pos = resolveDirWithSlide([], { x: 10, z: 0 }, 0, 0, 200, 1);
    const neg = resolveDirWithSlide([], { x: 10, z: 0 }, 0, 0, 200, -1);
    // The perpendicular components should have opposite signs
    expect(Math.sign(pos.vertical)).not.toBe(Math.sign(neg.vertical));
  });

  it("la dirección resultante siempre tiene módulo <= 1", () => {
    for (const stuckMs of [0, 150, 300, 550]) {
      const dir = resolveDirWithSlide([], { x: 3, z: 7 }, 0, 0, stuckMs);
      const mag = Math.sqrt(dir.horizontal ** 2 + dir.vertical ** 2);
      expect(mag).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
