"use client";

import { useCallback, useRef } from "react";
import { MathUtils } from "three";
import type { MovementPoint } from "@pointclick-engine/engine-core";

type ClickProgressState = {
  x: number;
  z: number;
  stuckMs: number;
};

type UseClickToMoveControllerConfig = {
  arrivalThreshold: number;
  stuckMovementEpsilon: number;
  stuckTimeoutMs: number;
};

type AutoMoveDirection = {
  horizontal: number;
  vertical: number;
  snapToTarget?: { x: number; z: number };
};

const DEFAULT_CONFIG: UseClickToMoveControllerConfig = {
  arrivalThreshold: 0.15,
  stuckMovementEpsilon: 0.015,
  stuckTimeoutMs: 550,
};

export function useClickToMoveController(
  config: Partial<UseClickToMoveControllerConfig> = {},
) {
  const mergedConfig: UseClickToMoveControllerConfig = { ...DEFAULT_CONFIG, ...config };

  const targetRef = useRef<MovementPoint | null>(null);
  const routeRef = useRef<MovementPoint[]>([]);
  const progressRef = useRef<ClickProgressState | null>(null);

  const cancelTarget = useCallback(() => {
    targetRef.current = null;
    routeRef.current = [];
    progressRef.current = null;
  }, []);

  const setTarget = useCallback((x: number, z: number) => {
    targetRef.current = { x, z };
    routeRef.current = [];
    progressRef.current = null;
  }, []);

  const setRoute = useCallback((route: MovementPoint[]) => {
    if (route.length === 0) return;
    routeRef.current = route;
    targetRef.current = route[route.length - 1] ?? null;
    progressRef.current = null;
  }, []);

  const resolveDirection = useCallback(
    (
      currentX: number,
      currentZ: number,
      delta: number,
      hasManualInput: boolean,
    ): AutoMoveDirection => {
      if (hasManualInput) return { horizontal: 0, vertical: 0 };

      while (routeRef.current.length > 0) {
        const next = routeRef.current[0]!;
        const dx = next.x - currentX;
        const dz = next.z - currentZ;
        if (Math.sqrt(dx * dx + dz * dz) < mergedConfig.arrivalThreshold) {
          routeRef.current.shift();
        } else {
          break;
        }
      }

      const target = routeRef.current[0] ?? targetRef.current;
      if (!target) return { horizontal: 0, vertical: 0 };

      const dx = target.x - currentX;
      const dz = target.z - currentZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < mergedConfig.arrivalThreshold) {
        if (routeRef.current.length > 0) routeRef.current.shift();
        if (routeRef.current.length === 0) {
          targetRef.current = null;
          return { horizontal: 0, vertical: 0, snapToTarget: target };
        }
        return { horizontal: 0, vertical: 0 };
      }

      return {
        horizontal: MathUtils.clamp(dx / dist, -1, 1),
        vertical: MathUtils.clamp(dz / dist, -1, 1),
      };
    },
    [mergedConfig.arrivalThreshold],
  );

  const registerProgress = useCallback(
    (
      currentX: number,
      currentZ: number,
      delta: number,
      hasManualInput: boolean,
    ): { stuck: boolean } => {
      if (hasManualInput || !targetRef.current) {
        progressRef.current = null;
        return { stuck: false };
      }

      const prev = progressRef.current;
      if (!prev) {
        progressRef.current = { x: currentX, z: currentZ, stuckMs: 0 };
        return { stuck: false };
      }

      const moved = Math.sqrt((currentX - prev.x) ** 2 + (currentZ - prev.z) ** 2);
      if (moved < mergedConfig.stuckMovementEpsilon) {
        prev.stuckMs += delta * 1000;
        if (prev.stuckMs > mergedConfig.stuckTimeoutMs) {
          progressRef.current = null;
          cancelTarget();
          return { stuck: true };
        }
      } else {
        prev.x = currentX;
        prev.z = currentZ;
        prev.stuckMs = 0;
      }

      return { stuck: false };
    },
    [cancelTarget, mergedConfig.stuckMovementEpsilon, mergedConfig.stuckTimeoutMs],
  );

  return { setTarget, setRoute, cancelTarget, resolveDirection, registerProgress };
}
