import type { GameSceneWall } from "@pointclick-engine/engine-core";
/**
 * SceneWallPlane – renders a wall texture as a camera-facing plane.
 *
 * Follows the same camera-billboard pattern as SceneBackgroundPlane:
 * the plane always faces the camera (quaternion copy) and is positioned
 * at the wall's world position plus an optional texturePosition offset.
 * depthTest/depthWrite are disabled so the texture renders on top of
 * scene geometry, ordered by renderOrder.
 *
 * Only rendered when `wall.textureUrl` is set.
 */
export declare function SceneWallPlane({ wall, renderOrder, }: {
    wall: GameSceneWall;
    /** Controls draw order when multiple wall planes overlap. Lower = drawn first. */
    renderOrder?: number;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=SceneWallPlane.d.ts.map