"use client";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneStore } from "@pointclick-engine/engine-core";
/** World units per second at which the character walks. */
const WALK_SPEED = 4.5;
export function usePlayerWalkAnimation(playerPosition, walkingState, onWalkAbort, onWalkComplete) {
    const updateWalkProgress = useSceneStore((s) => s.updateWalkProgress);
    const animatedPositionRef = useRef(playerPosition);
    const elapsedRef = useRef(0);
    const walkingStateRef = useRef(walkingState);
    const playerPositionRef = useRef(playerPosition);
    const onWalkCompleteRef = useRef(onWalkComplete);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _onWalkAbortRef = useRef(onWalkAbort);
    // Cache segment distances for the active walk. Recomputed whenever the walk identity changes.
    const pathCacheRef = useRef(null);
    useEffect(() => {
        walkingStateRef.current = walkingState;
        playerPositionRef.current = playerPosition;
        onWalkCompleteRef.current = onWalkComplete;
        _onWalkAbortRef.current = onWalkAbort;
    });
    useFrame((_, delta) => {
        const state = walkingStateRef.current;
        if (!state?.isActive) {
            animatedPositionRef.current = playerPositionRef.current;
            return;
        }
        const { pathPoints, targetPosition } = state;
        if (pathPoints.length < 2) {
            animatedPositionRef.current = playerPositionRef.current;
            return;
        }
        // Detect a new walk (different path or target) and reset elapsed time.
        const walkId = `${pathPoints[0]?.join(",")}->${targetPosition.join(",")}`;
        if (pathCacheRef.current?.walkId !== walkId) {
            elapsedRef.current = 0;
            const distances = buildCumulativeDistances(pathPoints);
            const total = distances[distances.length - 1];
            pathCacheRef.current = {
                walkId,
                distances,
                total,
                // Guard against zero-length paths to avoid division by zero.
                durationMs: total > 0 ? (total / WALK_SPEED) * 1000 : 300,
            };
        }
        const { distances, total, durationMs } = pathCacheRef.current;
        elapsedRef.current += delta * 1000;
        const progress = Math.min(elapsedRef.current / durationMs, 1);
        animatedPositionRef.current = samplePathPosition(pathPoints, distances, total, progress);
        updateWalkProgress(progress);
        if (progress >= 1) {
            onWalkCompleteRef.current?.();
            useSceneStore.getState().setPlayerWalkingState(null);
            elapsedRef.current = 0;
            pathCacheRef.current = null;
        }
    });
    return {
        animatedPosition: animatedPositionRef.current,
        isWalking: walkingStateRef.current?.isActive ?? false,
        progress: walkingStateRef.current?.progress ?? 0,
    };
}
/** Returns cumulative straight-line distances for each point in the path, starting at 0. */
export function buildCumulativeDistances(pathPoints) {
    const distances = [0];
    for (let i = 1; i < pathPoints.length; i++) {
        const dx = pathPoints[i][0] - pathPoints[i - 1][0];
        const dz = pathPoints[i][2] - pathPoints[i - 1][2];
        distances.push(distances[i - 1] + Math.sqrt(dx * dx + dz * dz));
    }
    return distances;
}
/** Samples a world position along the path at normalized progress in [0, 1]. */
export function samplePathPosition(pathPoints, distances, total, progress) {
    if (total === 0 || pathPoints.length === 0) {
        return pathPoints[pathPoints.length - 1] ?? [0, 0, 0];
    }
    const targetDist = progress * total;
    for (let i = 1; i < distances.length; i++) {
        if (distances[i] >= targetDist) {
            const segLen = distances[i] - distances[i - 1];
            const t = segLen > 0 ? (targetDist - distances[i - 1]) / segLen : 0;
            const a = pathPoints[i - 1];
            const b = pathPoints[i];
            return [
                a[0] + (b[0] - a[0]) * t,
                a[1],
                a[2] + (b[2] - a[2]) * t,
            ];
        }
    }
    return pathPoints[pathPoints.length - 1];
}
//# sourceMappingURL=usePlayerWalkAnimation.js.map