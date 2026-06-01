import type { GameVec3, PlayerWalkingState } from "@pointclick-engine/engine-core";
interface UsePlayerWalkAnimationResult {
    /** Current animated position (may differ from store position during walk) */
    animatedPosition: GameVec3;
    /** Whether currently walking */
    isWalking: boolean;
    /** Progress 0-1 */
    progress: number;
}
export declare function usePlayerWalkAnimation(playerPosition: GameVec3, walkingState: PlayerWalkingState | null, onWalkAbort?: (reason: "user-input" | "collision" | "unreachable") => void, onWalkComplete?: () => void): UsePlayerWalkAnimationResult;
/** Returns cumulative straight-line distances for each point in the path, starting at 0. */
export declare function buildCumulativeDistances(pathPoints: GameVec3[]): number[];
/** Samples a world position along the path at normalized progress in [0, 1]. */
export declare function samplePathPosition(pathPoints: GameVec3[], distances: number[], total: number, progress: number): GameVec3;
export {};
//# sourceMappingURL=usePlayerWalkAnimation.d.ts.map