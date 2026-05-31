import { type GameCharacterName } from "./sprite/clips";
import { type RuntimeEventHandler, type GameSceneWall, type WallToolMode } from "@pointclick-engine/engine-core";
export declare function GameTouchSpriteRuntime({ activeCharacter, debug, showDebugGround, showDebugWalls, showPlayerCollider, wallOpacityMode, wallInteractionsEnabled, wallToolMode, wallPointResetSignal, speechText, speechVisible, speechTrigger, speechCharsPerSecond, onSpeechLetterSound, onBoundaryHit, onSpeechDismiss, onRuntimeEvent, getMobileInput, addWallWithData, getPhrase, selectedWallIndex, onSelectWall, updateSelectedWall, disableClickToMove, getEffectiveClickGoal, }: {
    activeCharacter: GameCharacterName;
    debug: boolean;
    showDebugGround: boolean;
    showDebugWalls: boolean;
    /** Draws a wireframe over the player's CuboidCollider for inspection. */
    showPlayerCollider?: boolean;
    /** Render mode for debug walls. `wireframe` (default) o `opaque` (sólidos). */
    wallOpacityMode?: "wireframe" | "opaque";
    /**
     * When false, all wall meshes (wireframes + resize handles) ignore pointer
     * events. Used while the camera is in `free` mode so OrbitControls drag
     * doesn't pick up scene elements.
     */
    wallInteractionsEnabled?: boolean;
    wallToolMode: WallToolMode;
    wallPointResetSignal: number;
    speechText: string;
    speechVisible: boolean;
    speechTrigger: number;
    speechCharsPerSecond: number;
    onSpeechLetterSound?: () => void;
    onBoundaryHit: (phrase: string) => void;
    onSpeechDismiss: () => void;
    onRuntimeEvent?: RuntimeEventHandler;
    /**
     * DI: Returns current joystick/mobile input state.
     * Default: no-op (always inactive). Inject `useMobileInputStore.getState` for demo.
     */
    getMobileInput?: () => {
        active: boolean;
        x: number;
        z: number;
    };
    /**
     * DI: Adds a wall to the scene editor store.
     * Only used in debug mode. Inject from sceneEditorStore for demo.
     */
    addWallWithData?: (wall: GameSceneWall) => void;
    /**
     * @deprecated Pre-i18n DI. The runtime never reads this prop today — the
     * host computes the phrase from the `onCollide` runtime event using the
     * engine i18n store (`getRandomPhrase` from `@pointclick-engine/engine-core`
     * or the `useI18n` hook). Kept as an optional no-op for backward compat.
     */
    getPhrase?: (key: string) => string;
    /**
     * DI: Currently selected wall index for debug editor.
     * Inject from sceneEditorStore for demo.
     */
    selectedWallIndex?: number | null;
    /**
     * DI: Callback to select a wall in the editor.
     * Inject from sceneEditorStore for demo.
     */
    onSelectWall?: (index: number) => void;
    /**
     * DI: Mutator for the currently selected wall.
     * Required for click-and-drag move/resize to persist into scene state.
     * Inject from sceneEditorStore for demo.
     */
    updateSelectedWall?: (updater: (wall: GameSceneWall) => GameSceneWall) => void;
    /**
     * If true, clicks on the ground will not move the player. Used by the
     * debug editor mode to avoid race conditions with mouse-driven edits and
     * by the free-camera mode to prevent accidental pathfinding triggers.
     * The point-tool path keeps working so walls can still be drawn.
     */
    disableClickToMove?: boolean;
    /**
     * DI: optional pre-processor for click-to-move goals. Receives the
     * clamped click point and the player's current position; returns a
     * possibly redirected goal. Use to snap clicks that would otherwise
     * route around an obstacle (e.g. a closed door) to a sensible approach
     * point instead. Return `null` or `undefined` to leave the goal as-is.
     */
    getEffectiveClickGoal?: (clickX: number, clickZ: number, playerX: number, playerZ: number) => {
        x: number;
        z: number;
    } | null | undefined;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GameTouchSpriteRuntime.d.ts.map