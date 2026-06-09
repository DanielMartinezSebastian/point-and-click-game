"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import { PixelLoader } from "./PixelLoader";

import {
  type GameCharacterName,
} from "./sprite/clips";
import dynamic from "next/dynamic";
import { DraggedInventoryGhost, InventoryUI } from "./InventoryUI";
import { SceneDropTargets } from "./inventory/SceneDropTargets";
import { PlacedSceneItems } from "./inventory/PlacedSceneItems";
import { SceneBackgroundPlane } from "./scene/SceneBackgroundPlane";
import { CameraController, CameraFitHeight } from "./scene/SceneCameraControllers";
import { FreeCameraController } from "./scene/FreeCameraController";
import { SceneDoors } from "./scene/SceneDoors";
import { SCENES } from "../../demo-content/scenes/scenes";
import { DebugOverlayRuntimePanel } from "./debug/DebugOverlayRuntimePanel";
import { GameTouchSpriteRuntime, SceneTransitions } from "@pointclick-engine/engine-renderer-r3f";
import { useInventoryRuntimeController } from "../lib/engine/runtime/useInventoryRuntimeController";
import { useInteractionEditorController } from "../lib/engine/runtime/useInteractionEditorController";
import { useDebugPanelController } from "../lib/engine/runtime/useDebugPanelController";
import { useDebugModeEffects } from "../lib/engine/runtime/useDebugModeEffects";
import { useSceneRuntimeController } from "../lib/engine/runtime/useSceneRuntimeController";
import { useDoorSystem } from "../lib/engine/runtime/useDoorSystem";
import { useTransitionSystem } from "../lib/engine/runtime/useTransitionSystem";
import { useTransitionEditorController } from "../lib/engine/runtime/useTransitionEditorController";
import { legacyRuntimeEventToGameEvent, type RuntimeEvent, type GameSceneTransition, type GameScene, useSceneStore } from "@pointclick-engine/engine-core";
import { getGameRuntime } from "../lib/engine/publicApi";
import { webAudioAdapter } from "../lib/platform-web-audio";
import { audioSettingsStore } from "../store/audio";
import { useMobileInputStore } from "../store/mobileInputStore";
import { useSceneEditorStore } from "../store/sceneEditorStore";
import { useDialogStore } from "../store/dialogStore";
import { useInventoryStore } from "../store/inventoryStore";
import {
  selectGameInteractionsDisabled,
  selectSceneEditingBlocked,
  useEditorModeStore,
} from "../store/editorModeStore";

// Carga el joystick solo en cliente (ssr: false); la detección de dispositivo
// táctil se realiza dentro del propio componente con window garantizado.
const Joystick = dynamic(() => import("./Joystick"), { ssr: false });

const CAMERA_POSITION: [number, number, number] = [0, 5.4, 25.0];
const EMPTY_TRANSITIONS: GameSceneTransition[] = [];

type GameTouchCanvasProps = {
  debug?: boolean;
  onRuntimeEvent?: (event: RuntimeEvent) => void;
  /** Contenido extra dentro del mundo físico (p.ej. <RemotePlayers/> en /multiplayer). */
  extraCanvasChildren?: React.ReactNode;
};

/**
 * Se monta dentro del Suspense del runtime — cuando este componente llega al
 * DOM significa que useLoader ha resuelto todos los assets del personaje.
 * Llama onReady una sola vez para señalizar al PixelLoader.
 */
function SceneReadyReporter({ onReady }: { onReady: () => void }) {
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current(); }, []); // intentional: run once on mount
  return null;
}

export default function GameTouchCanvas({
  debug: debugOverride,
  onRuntimeEvent,
  extraCanvasChildren,
}: GameTouchCanvasProps = {}) {
  const selectedCharacter: GameCharacterName = "Dave";
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  const { isDebug } = useDebugModeEffects();
  const runtimeDebug = typeof debugOverride === "boolean" ? debugOverride : isDebug;

  // Expone el sceneStore en window para tests E2E / debug externo.
  // Solo activo cuando debug mode está habilitado (nunca en producción).
  useEffect(() => {
    if (!runtimeDebug) return;
    (window as unknown as Record<string, unknown>).__sceneStore = useSceneStore;
    return () => {
      delete (window as unknown as Record<string, unknown>).__sceneStore;
    };
  }, [runtimeDebug]);

  const baseRuntimeEvent = useCallback((event: RuntimeEvent) => {
    // Legacy callback (backwards compat)
    onRuntimeEvent?.(event);
    // Also emit to the bidirectional event bus (Phase 4)
    const gameEvent = legacyRuntimeEventToGameEvent(event);
    getGameRuntime()?.emit(gameEvent);
    if (!runtimeDebug) return;
    console.debug("[runtime-event]", event);
  }, [onRuntimeEvent, runtimeDebug]);

  const {
    isDebugGroundVisible,
    setIsDebugGroundVisible,
    isDebugWallsVisible,
    setIsDebugWallsVisible,
    wallToolMode,
    wallPointResetSignal,
    handleWallToolModeChange,
    resetWallPointTool,
    speechDraft,
    setSpeechDraft,
    speechCharsPerSecond,
    setSpeechCharsPerSecond,
  } = useDebugPanelController();
  const {
    sceneId,
    sceneBackground,
    setScene,
    sceneInteractions,
    requestRespawn,
    playerPosition,
    scenePlayerSpawn,
    updateInteraction,
    resetInteractionsFromSceneConfig,
    sceneOptions,
  } = useSceneRuntimeController();

  // Doors are demo-only data (not in engine-core's GameScene). Read them from
  // the SCENES registry by current sceneId. The door event bridge wraps the
  // base runtime handler so `onDrop`+`consume` events open matching doors.
  const currentScene = SCENES[sceneId];
  const sceneDoors = currentScene?.doors ?? [];

  // ── Fade curtain for scene transitions ────────────────────────────────────
  // The overlay div is always in the DOM. We manipulate it directly (bypassing
  // React state) so the curtain drops synchronously before any re-render with
  // the new (backgroundless) scene data.
  const fadeOverlayRef = useRef<HTMLDivElement>(null);

  const handleBeforeSceneChange = useCallback(() => {
    const el = fadeOverlayRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.opacity = "1";
    el.style.pointerEvents = "all";
  }, []);

  const handleBackgroundReady = useCallback(() => {
    const el = fadeOverlayRef.current;
    if (!el || el.style.opacity !== "1") return;
    // Force layout flush so the transition triggers on the next style change.
    el.getBoundingClientRect();
    el.style.transition = "opacity 0.45s ease";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
  }, []);

  const { handleTransitionTriggered, wrapRuntimeEventForTransitions } = useTransitionSystem({
    onBeforeChange: handleBeforeSceneChange,
    resolveScene: (id) => (SCENES[id] as GameScene | undefined) ?? null,
  });

  const afterDoorRuntimeEvent = useDoorSystem({
    scene: currentScene,
    passthrough: baseRuntimeEvent,
  });

  // Sync audio settings (already hydrated from localStorage at module load)
  // to the webAudioAdapter on mount AND on every subsequent change. Without
  // the initial apply the adapter starts at its defaults and ignores any
  // persisted mute until the user toggles a setting.
  useEffect(() => {
    const apply = (state: ReturnType<typeof audioSettingsStore.getState>) => {
      webAudioAdapter.setMuted("master", state.masterMuted);
      webAudioAdapter.setMuted("music", state.musicMuted);
      webAudioAdapter.setMuted("sfx", state.sfxMuted);
      webAudioAdapter.setVolume("master", state.masterVolume);
      webAudioAdapter.setVolume("music", state.musicVolume);
      webAudioAdapter.setVolume("sfx", state.sfxVolume);
    };
    apply(audioSettingsStore.getState());
    return audioSettingsStore.subscribe(apply);
  }, []);

  // Click sound for inventory toggle
  const isInventoryOpen = useInventoryStore((s) => s.isOpen);
  const toggleInventory = useInventoryStore((s) => s.toggle);
  useEffect(() => {
    webAudioAdapter.playSound({
      id: "click",
      url: "/assets/audio/sfx/click.ogg",
      category: "ui",
    });
  }, [isInventoryOpen]);

  // Initialize audio system - listen to scene changes
  const scene = useSceneStore((s) => s.scene);
  useEffect(() => {
    console.log("[audio] Scene changed:", scene.id, "music:", scene?.music);
    if (scene?.music) {
      console.log("[audio] Playing music:", scene.music.trackUrl);
      webAudioAdapter.playMusic({
        id: scene.music.trackUrl,
        url: scene.music.trackUrl,
        category: "music",
        loop: true,
      }, { fadeMs: scene.music.fadeMs ?? 800 });
    }
  }, [scene?.music?.trackUrl]);

  // Click sound on canvas for pathfinding
  const playerWalkingState = useSceneStore((s) => s.playerWalkingState);
  const prevWalkingRef = useRef<any>(null);
  useEffect(() => {
    // Play click sound when walking starts (transition from null to walking state)
    if (playerWalkingState && !prevWalkingRef.current) {
      webAudioAdapter.playSound({
        id: "click-canvas",
        url: "/assets/audio/sfx/click.ogg",
        category: "ui",
      });
    }
    prevWalkingRef.current = playerWalkingState;
  }, [playerWalkingState]);

  // Initialize SFX playback via event bus
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const trySubscribe = setInterval(() => {
      const runtime = getGameRuntime();
      if (!runtime) return;

      clearInterval(trySubscribe);

      const subs = [
        runtime.on("item:dropped", (event: any) => {
          console.log("[audio] item:dropped -", JSON.stringify(event));
          // Differentiate by outcome: pickup-success = pickup sound, place = drop sound
          const soundMap: Record<string, { pickup: string; drop: string }> = {
            gameboy: {
              pickup: "/assets/audio/sfx/pickup-gameboy.ogg",
              drop: "/assets/audio/sfx/drop-default.ogg",
            },
            default: {
              pickup: "/assets/audio/sfx/pickup-default.ogg",
              drop: "/assets/audio/sfx/drop-default.ogg",
            },
          };

          const itemSounds = soundMap[event.itemId] || soundMap.default;

          if (event.outcome === "pickup-success") {
            webAudioAdapter.playSound({
              id: `pickup-${event.itemId}`,
              url: itemSounds.pickup,
              category: "sfx",
            });
          } else if (event.outcome === "place") {
            webAudioAdapter.playSound({
              id: `drop-${event.itemId}`,
              url: itemSounds.drop,
              category: "sfx",
            });
          }
        }),
        runtime.on("transition:triggered", () => {
          console.log("[audio] Playing transition sound");
          webAudioAdapter.playSound({
            id: "transition-default",
            url: "/assets/audio/sfx/transition-default.ogg",
            category: "sfx",
          });
        }),
      ];

      unsubscribe = () => subs.forEach((u) => u?.());
    }, 50);

    return () => {
      clearInterval(trySubscribe);
      unsubscribe?.();
    };
  }, []);

  // Chain: door system → transition item-drop check
  const handleRuntimeEvent = useCallback(
    wrapRuntimeEventForTransitions(afterDoorRuntimeEvent.handleRuntimeEvent),
    [wrapRuntimeEventForTransitions, afterDoorRuntimeEvent.handleRuntimeEvent],
  );
  const { getEffectiveClickGoal } = afterDoorRuntimeEvent;

  // Dialog state lives in dialogStore (also writable via dialog:trigger / dialog:dismiss commands)
  const speechText = useDialogStore((s) => s.text);
  const speechVisible = useDialogStore((s) => s.visible);
  const speechTrigger = useDialogStore((s) => s.triggerCount);

  const handleSpeechLetterSound = useCallback(() => {
    const n = Math.floor(Math.random() * 4) + 1;
    const url = `/assets/audio/sfx/speak (${n}).mp3`;
    webAudioAdapter.playSound({ id: url, url, category: "sfx" }, { volume: 0.35 });
  }, []);

  // Get transitions from scene
  const sceneTransitions = useSceneStore((s) => s.scene.transitions ?? EMPTY_TRANSITIONS);

  const {
    inventorySlots,
    draggedStack,
    placedItems,
    handleBoundaryHit,
    showSpeechBubble,
    hideSpeechBubble,
    handleInteractionInspect,
    handleInventoryDropHit,
    handleInventoryDropMiss,
    handleInventoryDropOnPlayer,
    handlePickupPlacedItem,
    updatePlacedItemPosition,
    movePlacedItemToPlayer,
    removePlacedItemById,
    handleStartInventoryDrag,
    handleItemInteract,
  } = useInventoryRuntimeController({
    sceneId,
    sceneInteractions,
    playerPosition,
    onRuntimeEvent: handleRuntimeEvent,
  });

  const {
    updateInteractionPosition,
    updateInteractionHalfSize,
    updateInteractionRotationDeg,
    moveInteractionToPlayer,
  } = useInteractionEditorController({
    playerPosition,
    scenePlayerSpawnY: scenePlayerSpawn[1],
    updateInteraction,
  });

  const {
    updateTransitionPosition,
    updateTransitionHalfSize,
    updateTransitionTargetScene,
    moveTransitionToPlayer,
    createTransition,
    deleteTransition,
  } = useTransitionEditorController();

  // DI props for renderer-r3f's GameTouchSpriteRuntime
  const addWallWithData = useSceneEditorStore((s) => s.addWallWithData);
  const selectedWallIndex = useSceneEditorStore((s) => s.selectedWallIndex);
  const onSelectWall = useSceneEditorStore((s) => s.selectWall);
  const updateSelectedWall = useSceneEditorStore((s) => s.updateSelectedWall);

  // Editor / camera modes (debug only; defaults preserve runtime behavior)
  const disableClickToMove = useEditorModeStore(selectGameInteractionsDisabled);
  const sceneEditingBlocked = useEditorModeStore(selectSceneEditingBlocked);
  const wallInteractionsEnabled = !sceneEditingBlocked;
  const wallOpacityMode = useEditorModeStore((s) => s.wallOpacityMode);
  const cameraMode = useEditorModeStore((s) => s.cameraMode);
  const showPlayerCollider = useEditorModeStore((s) => s.showPlayerCollider);

  const readyMessage = `${selectedCharacter} listo — flechas/WASD o click para moverse`;

  return (
    <div style={{ position: "fixed", inset: 0, width: "100dvw", height: "100dvh", overflow: "hidden" }}>

      <PixelLoader ready={sceneReady} />

      <Canvas
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: false }}
        onPointerDownCapture={() => useInventoryStore.getState().close()}
        onCreated={(state) => {
          try {
            const glCtx = state.gl.getContext();
            console.log("Three: renderer created", {
              contextAttributes: glCtx?.getContextAttributes?.(),
              version: glCtx?.getParameter?.(glCtx.VERSION),
              shadingLanguageVersion: glCtx?.getParameter?.(glCtx.SHADING_LANGUAGE_VERSION),
            });
            state.gl.setClearColor(0x0f0f10, 1);
            state.gl.clear();
          } catch (err) {
            console.error("Three: onCreated error", err);
          }
        }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, background: "transparent", display: "block" }}
      >
        <OrthographicCamera makeDefault position={CAMERA_POSITION} rotation={[-0.24, 0, 0]} near={0.01} far={120} />
        {cameraMode === "fixed" && <CameraFitHeight desiredWorldHeight={19.28} />}
        {/* <fog attach="fog" args={["#070d1f", 20, 55]} /> */}
        <ambientLight intensity={1.1} color="#8bc2ff" />
        <directionalLight position={[3, 9, 6]} intensity={1.5} color="#d8ecff" />
        <SceneBackgroundPlane url={sceneBackground} onReady={handleBackgroundReady} />
        {cameraMode === "fixed" && <CameraController />}
        <FreeCameraController />
        <Physics gravity={[0, -20, 0]}>
          <Suspense fallback={null}>
            <GameTouchSpriteRuntime
              activeCharacter={selectedCharacter}
              debug={runtimeDebug}
              showDebugGround={isDebugGroundVisible}
              showDebugWalls={isDebugWallsVisible}
              showPlayerCollider={showPlayerCollider}
              wallOpacityMode={wallOpacityMode}
              wallInteractionsEnabled={wallInteractionsEnabled}
              wallToolMode={wallToolMode}
              disableClickToMove={disableClickToMove}
              getEffectiveClickGoal={getEffectiveClickGoal}
              wallPointResetSignal={wallPointResetSignal}
              speechText={speechText}
              speechVisible={speechVisible}
              speechTrigger={speechTrigger}
              speechCharsPerSecond={speechCharsPerSecond}
              onSpeechLetterSound={handleSpeechLetterSound}
              onBoundaryHit={handleBoundaryHit}
              onSpeechDismiss={hideSpeechBubble}
              onRuntimeEvent={handleRuntimeEvent}
              getMobileInput={useMobileInputStore.getState}
              addWallWithData={addWallWithData}
              selectedWallIndex={selectedWallIndex}
              onSelectWall={onSelectWall}
              updateSelectedWall={updateSelectedWall}
            />
            <SceneReadyReporter onReady={handleSceneReady} />
          </Suspense>
          <SceneDropTargets
            targets={sceneInteractions}
            draggedStack={draggedStack ? { stack: draggedStack.stack, fromSlotIndex: draggedStack.fromSlotIndex } : null}
            onDropHit={handleInventoryDropHit}
            onDropMiss={handleInventoryDropMiss}
            onInspect={handleInteractionInspect}
            playerDropTarget={{
              position: playerPosition,
              onDrop: handleInventoryDropOnPlayer,
            }}
          />
          <PlacedSceneItems
            items={placedItems.filter(
              (item) =>
                item.sceneId === sceneId ||
                (item.sceneId === undefined && sceneId === "personalRoom")
            )}
            onPickup={handlePickupPlacedItem}
            onInteract={handleItemInteract}
            canPickup={!isInventoryOpen && !disableClickToMove && !speechVisible}
          />
          <SceneDoors doors={sceneDoors} />
          <SceneTransitions
            debug={runtimeDebug}
            onTransitionTriggered={handleTransitionTriggered}
          />
          {extraCanvasChildren}
        </Physics>
      </Canvas>

      <Joystick />
      <InventoryUI
        isOpen={isInventoryOpen}
        slots={inventorySlots}
        onToggle={toggleInventory}
        onStartDrag={handleStartInventoryDrag}
      />
      {draggedStack && (
        <DraggedInventoryGhost
          stack={draggedStack.stack}
          initialPointerX={draggedStack.pointerX}
          initialPointerY={draggedStack.pointerY}
        />
      )}
      <DebugOverlayRuntimePanel
        isDebug={runtimeDebug}
        isDebugGroundVisible={isDebugGroundVisible}
        setIsDebugGroundVisible={setIsDebugGroundVisible}
        isDebugWallsVisible={isDebugWallsVisible}
        setIsDebugWallsVisible={setIsDebugWallsVisible}
        sceneId={sceneId}
        setScene={setScene}
        sceneOptions={sceneOptions}
        readyMessage={readyMessage}
        requestRespawn={requestRespawn}
        wallToolMode={wallToolMode}
        handleWallToolModeChange={handleWallToolModeChange}
        resetWallPointTool={resetWallPointTool}
        speechDraft={speechDraft}
        setSpeechDraft={setSpeechDraft}
        speechCharsPerSecond={speechCharsPerSecond}
        setSpeechCharsPerSecond={setSpeechCharsPerSecond}
        showSpeechBubble={showSpeechBubble}
        hideSpeechBubble={hideSpeechBubble}
        speechVisible={speechVisible}
        sceneInteractions={sceneInteractions}
        updateInteractionPosition={updateInteractionPosition}
        updateInteractionHalfSize={updateInteractionHalfSize}
        updateInteractionRotationDeg={updateInteractionRotationDeg}
        moveInteractionToPlayer={moveInteractionToPlayer}
        resetInteractionsFromSceneConfig={resetInteractionsFromSceneConfig}
        placedItems={placedItems}
        updatePlacedItemPosition={updatePlacedItemPosition}
        movePlacedItemToPlayer={movePlacedItemToPlayer}
        removePlacedItemById={removePlacedItemById}
        sceneTransitions={sceneTransitions}
        updateTransitionPosition={updateTransitionPosition}
        updateTransitionHalfSize={updateTransitionHalfSize}
        updateTransitionTargetScene={updateTransitionTargetScene}
        moveTransitionToPlayer={moveTransitionToPlayer}
        addTransition={createTransition}
        removeTransition={deleteTransition}
      />

      {/* Cortina de transición: siempre en DOM, opacidad 0 en reposo.
          Se activa/desactiva via ref para evitar el batching de React. */}
      <div
        ref={fadeOverlayRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 500,
          background: "#070d1f",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
