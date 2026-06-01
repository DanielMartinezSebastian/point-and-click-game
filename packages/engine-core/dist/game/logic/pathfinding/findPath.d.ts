import type { GameSceneGround, GameSceneInteraction, GameSceneWall } from "../../types";
export type MovementPoint = {
    x: number;
    z: number;
};
type MovementBounds = Pick<GameSceneGround, "minX" | "maxX" | "minZ" | "maxZ">;
type FindPathOptions = {
    start: MovementPoint;
    goal: MovementPoint;
    bounds: MovementBounds;
    walls: GameSceneWall[];
    interactions: GameSceneInteraction[];
    cellSize?: number;
    obstaclePadding?: number;
    /**
     * Clearance added around collision interaction objects (pedestals, props).
     * These are typically small standalone cubes that need less clearance than
     * long thin walls. Defaults to 0.3 — just over the player's half-width (0.275)
     * so the character still fits past them without wasting navigable space.
     */
    interactionPadding?: number;
    segmentSampleStep?: number;
    maxIterations?: number;
    /**
     * When the goal is unreachable, return a partial route to the open cell
     * closest to the goal instead of `null`. Default true — this keeps the
     * character moving toward the destination instead of freezing in place.
     */
    allowPartialPath?: boolean;
};
export declare function findPath({ start, goal, bounds, walls, interactions, cellSize, obstaclePadding, interactionPadding, segmentSampleStep, maxIterations, allowPartialPath, }: FindPathOptions): MovementPoint[] | null;
export {};
//# sourceMappingURL=findPath.d.ts.map