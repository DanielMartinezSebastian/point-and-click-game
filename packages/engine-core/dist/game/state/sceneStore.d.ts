import type { GameScene, GameSceneWall, GameSceneInteractionFull, GameVec3, TransitionState, PlayerWalkingState } from "../types";
import type { GameEvent } from "../events/types";
type StoreEmitter = (event: GameEvent) => void;
/**
 * Inyecta el emisor de eventos del runtime. Llamado por `createGameRuntime`
 * al inicializar el bus. Si no se llama, el store funciona en zero-event mode.
 */
export declare function setSceneStoreEmitter(emitter: StoreEmitter | null): void;
type SceneStoreLogger = (event: string, payload: Record<string, unknown>) => void;
/**
 * Inyecta un logger custom para debug de scene-store (p.ej. window.__gameTrace en browser).
 * Si no se llama, el store usa console.info en desarrollo.
 * Pasar null para deshabilitar el logger completamente.
 */
export declare function setSceneStoreLogger(logger: SceneStoreLogger | null): void;
/**
 * sceneStore – estado runtime de la escena activa.
 *
 * Invariantes de ownership:
 * - Propietario de: sceneId, scene (datos runtime), playerPosition, respawnSignal.
 * - NO gestiona estado de editor (selección de muros, etc). Ver sceneEditorStore.
 * - appendWall / removeWall / updateWall son helpers de mutación que el editor
 *   puede invocar vía sceneEditorStore sin acoplar stores en sentido contrario.
 */
type SceneStore = {
    sceneId: string;
    scene: GameScene;
    playerPosition: GameVec3;
    respawnSignal: number;
    transitionStates: Record<string, TransitionState>;
    playerWalkingState: PlayerWalkingState | null;
    setScene: (id: string, scene: GameScene, spawnPosition?: GameVec3) => void;
    updateInteraction: (id: string, updater: (interaction: GameSceneInteractionFull) => GameSceneInteractionFull) => void;
    resetInteractionsFromSceneConfig: () => void;
    setPlayerPosition: (position: GameVec3) => void;
    requestRespawn: () => void;
    setTransitionAvailable: (id: string, available: boolean) => void;
    setTransitionItemOccupying: (id: string, itemId: string | undefined) => void;
    setPlayerWalkingState: (state: PlayerWalkingState | null) => void;
    updateWalkProgress: (progress: number) => void;
    updateGround: (updater: (ground: GameScene["ground"]) => GameScene["ground"]) => void;
    appendWall: (wall: GameSceneWall) => void;
    removeWall: (index: number) => void;
    updateWall: (index: number, updater: (wall: GameSceneWall) => GameSceneWall) => void;
    updateTransition: (id: string, updater: (transition: import("../types").GameSceneTransition) => import("../types").GameSceneTransition) => void;
    addTransition: (transition: import("../types").GameSceneTransition) => void;
    removeTransition: (id: string) => void;
};
export declare const useSceneStore: import("zustand").UseBoundStore<import("zustand").StoreApi<SceneStore>>;
/** Read state without React (for use from other renderers or tests) */
export declare function getSceneState(): SceneStore;
/** Subscribe to state changes without React */
export declare function subscribeSceneState(listener: (state: ReturnType<typeof useSceneStore.getState>) => void): () => void;
export {};
//# sourceMappingURL=sceneStore.d.ts.map