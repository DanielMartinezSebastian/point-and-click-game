import { create } from "zustand";
let _emitter = null;
/**
 * Inyecta el emisor de eventos del runtime. Llamado por `createGameRuntime`
 * al inicializar el bus. Si no se llama, el store funciona en zero-event mode.
 */
export function setSceneStoreEmitter(emitter) {
    _emitter = emitter;
}
function emit(event) {
    if (_emitter)
        _emitter(event);
}
const SHOULD_LOG_STATE_TRANSITIONS = process.env.NODE_ENV !== "production";
let _logger = null;
/**
 * Inyecta un logger custom para debug de scene-store (p.ej. window.__gameTrace en browser).
 * Si no se llama, el store usa console.info en desarrollo.
 * Pasar null para deshabilitar el logger completamente.
 */
export function setSceneStoreLogger(logger) {
    _logger = logger;
}
function logSceneStore(event, payload) {
    if (!SHOULD_LOG_STATE_TRANSITIONS)
        return;
    if (_logger) {
        _logger(event, payload);
    }
    else {
        console.info(`[scene-store] ${event}`, payload);
    }
}
function cloneWall(wall) {
    return {
        position: [...wall.position],
        rotationY: wall.rotationY,
        halfSize: [...wall.halfSize],
        openings: wall.openings
            ? wall.openings.map((opening) => ({
                id: opening.id,
                position: [...opening.position],
                halfSize: [...opening.halfSize],
            }))
            : undefined,
        textureUrl: wall.textureUrl,
        texturePosition: wall.texturePosition
            ? [...wall.texturePosition]
            : undefined,
    };
}
function cloneInteraction(interaction) {
    return {
        ...interaction,
        position: [...interaction.position],
        halfSize: [...interaction.halfSize],
        acceptsItemIds: interaction.acceptsItemIds
            ? [...interaction.acceptsItemIds]
            : undefined,
        dialogKeys: { ...interaction.dialogKeys },
    };
}
function cloneScene(scene) {
    return {
        ...scene,
        playerSpawn: [...scene.playerSpawn],
        ground: { ...scene.ground },
        walls: scene.walls.map(cloneWall),
        interactions: scene.interactions.map(cloneInteraction),
        transitions: scene.transitions
            ? scene.transitions.map((t) => ({ ...t, position: [...t.position], halfSize: [...t.halfSize] }))
            : undefined,
    };
}
export const useSceneStore = create((set, get) => ({
    sceneId: "",
    scene: {
        id: "",
        label: "",
        background: "",
        playerSpawn: [0, 0, 0],
        ground: { minX: 0, maxX: 0, minZ: 0, maxZ: 0, y: 0 },
        walls: [],
        interactions: [],
    },
    playerPosition: [0, 0, 0],
    respawnSignal: 0,
    transitionStates: {},
    playerWalkingState: null,
    setScene: (id, scene, spawnPosition) => {
        const clonedScene = cloneScene(scene);
        const finalSpawnPosition = spawnPosition ?? clonedScene.playerSpawn;
        logSceneStore("set-scene", {
            fromSceneId: get().sceneId,
            toSceneId: id,
            spawn: finalSpawnPosition,
        });
        // Preserve playerWalkingState during scene changes so walk animation continues
        const prevWalkingState = get().playerWalkingState;
        set({
            sceneId: id,
            scene: clonedScene,
            playerPosition: [...finalSpawnPosition],
            playerWalkingState: prevWalkingState,
        });
        emit({ type: "scene:changed", sceneId: id, scene: clonedScene });
    },
    updateGround: (updater) => set((state) => ({
        scene: {
            ...state.scene,
            ground: updater({ ...state.scene.ground }),
        },
    })),
    appendWall: (wall) => set((state) => ({
        scene: {
            ...state.scene,
            walls: [...state.scene.walls, cloneWall(wall)],
        },
    })),
    removeWall: (index) => set((state) => ({
        scene: {
            ...state.scene,
            walls: state.scene.walls.filter((_, i) => i !== index),
        },
    })),
    updateWall: (index, updater) => set((state) => ({
        scene: {
            ...state.scene,
            walls: state.scene.walls.map((wall, i) => i !== index ? wall : updater(cloneWall(wall))),
        },
    })),
    updateInteraction: (id, updater) => set((state) => ({
        scene: {
            ...state.scene,
            interactions: state.scene.interactions.map((interaction) => {
                if (interaction.id !== id)
                    return interaction;
                return updater(cloneInteraction(interaction));
            }),
        },
    })),
    resetInteractionsFromSceneConfig: () => set((state) => {
        logSceneStore("reset-interactions", {
            sceneId: state.sceneId,
            interactionCount: state.scene.interactions.length,
        });
        return {
            scene: {
                ...state.scene,
                interactions: state.scene.interactions.map(cloneInteraction),
            },
        };
    }),
    setPlayerPosition: (position) => set({ playerPosition: position }),
    setTransitionAvailable: (id, available) => set((state) => ({
        transitionStates: {
            ...state.transitionStates,
            [id]: { ...state.transitionStates[id], isAvailable: available },
        },
    })),
    setTransitionItemOccupying: (id, itemId) => set((state) => ({
        transitionStates: {
            ...state.transitionStates,
            [id]: { ...state.transitionStates[id], itemIdOccupying: itemId },
        },
    })),
    requestRespawn: () => {
        const state = get();
        const nextRespawnSignal = state.respawnSignal + 1;
        logSceneStore("request-respawn", {
            sceneId: state.sceneId,
            previousRespawnSignal: state.respawnSignal,
            nextRespawnSignal,
            currentPlayerPosition: state.playerPosition,
        });
        set({ respawnSignal: nextRespawnSignal });
        emit({ type: "scene:respawnRequested", sceneId: state.sceneId });
    },
    updateTransition: (id, updater) => set((state) => ({
        scene: {
            ...state.scene,
            transitions: (state.scene.transitions || []).map((transition) => {
                if (transition.id !== id)
                    return transition;
                return updater(transition);
            }),
        },
    })),
    addTransition: (transition) => set((state) => ({
        scene: {
            ...state.scene,
            transitions: [...(state.scene.transitions || []), transition],
        },
    })),
    removeTransition: (id) => set((state) => ({
        scene: {
            ...state.scene,
            transitions: (state.scene.transitions || []).filter((t) => t.id !== id),
        },
    })),
    setPlayerWalkingState: (state) => {
        // console.log(`[sceneStore] setPlayerWalkingState:`, state?.isActive ? `active, pathPoints=${state.pathPoints.length}` : "cleared");
        set({ playerWalkingState: state });
    },
    updateWalkProgress: (progress) => set((state) => {
        if (!state.playerWalkingState)
            return state;
        return {
            playerWalkingState: {
                ...state.playerWalkingState,
                progress,
            },
        };
    }),
}));
/** Read state without React (for use from other renderers or tests) */
export function getSceneState() {
    return useSceneStore.getState();
}
/** Subscribe to state changes without React */
export function subscribeSceneState(listener) {
    return useSceneStore.subscribe(listener);
}
//# sourceMappingURL=sceneStore.js.map