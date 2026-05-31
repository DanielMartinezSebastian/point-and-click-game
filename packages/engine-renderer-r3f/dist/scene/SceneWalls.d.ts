export type WallResizeHandle = "x+" | "x-" | "z+" | "z-";
export declare function SceneWalls({ debug, opacityMode, interactionsEnabled, onStartWallMove, onStartWallResize, selectedWallIndex, onSelectWall, }: {
    debug: boolean;
    /** `wireframe` (default) o `opaque` (sólidos translúcidos). */
    opacityMode?: "wireframe" | "opaque";
    /**
     * When false, all wall meshes ignore pointer events — used while the
     * camera is in `free` mode so OrbitControls drag doesn't accidentally
     * select / move a wall. Defaults to true (normal editor behaviour).
     */
    interactionsEnabled?: boolean;
    onStartWallMove: (index: number, pointX: number, pointZ: number) => void;
    onStartWallResize: (index: number, handle: WallResizeHandle) => void;
    /** Currently selected wall index for debug editor (injected via DI). */
    selectedWallIndex?: number | null;
    /** Callback to select a wall in the editor (injected via DI). */
    onSelectWall?: (index: number) => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SceneWalls.d.ts.map