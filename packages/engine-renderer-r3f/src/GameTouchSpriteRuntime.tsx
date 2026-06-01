"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { Collider as RapierCollider } from "@dimforge/rapier3d-compat";
import { MathUtils, Mesh, Vector2, Vector3 } from "three";

import SpeechBubble from "./SpeechBubble";
import DavidSprite, { type DavidSpriteHandle } from "./sprite/DavidSprite";
import {
  DAVE_IDLE_SPEAKING,
  GAME_CHARACTER_SPRITES,
  type GameCharacterName,
  type GameDirection,
} from "./sprite/clips";
import { buildSpeakingAnimation } from "./sprite/speakingAnimation";
import { SceneCollisionSphere } from "./scene/SceneCollisionSphere";
import { SceneGround } from "./scene/SceneGround";
import { SceneWallPointPreview } from "./scene/SceneWallPointPreview";
import { SceneWalls, type WallResizeHandle } from "./scene/SceneWalls";

import { findPath, useSceneStore, emitRuntimeEvent, resolveTransitionFromClickOnCollider, type RuntimeEventHandler, type GameSceneWall, type WallToolMode } from "@pointclick-engine/engine-core";
import { usePlayerWalkAnimation } from "./hooks/usePlayerWalkAnimation";
import { useClickToMoveController } from "./hooks/useClickToMoveController";
import { useKeyboardMovementInput } from "./adapters/useKeyboardMovementInput";

// ── Main runtime component ───────────────────────────────────────────────────

type MovementAction = GameDirection;
type WallPointStart = { point: Vector2; resetSignal: number };
type WallPointPreview = { start: Vector2; end: Vector2; resetSignal: number };
type WallInteraction =
  | { mode: "move"; index: number; offsetX: number; offsetZ: number }
  | { mode: "resize"; index: number; handle: WallResizeHandle }
  | null;

const VERTICAL_ANGLE_THRESHOLD = 55 * (Math.PI / 180);
const DEPTH_FAR_Z = -16;
const DEPTH_NEAR_Z = 8;
const SPRITE_MIN_SCALE = 1.4;
const SPRITE_MAX_SCALE = 2.94;
const MIN_WALL_HALF_EXTENT = 0.15;
const PLAYER_BOUND_MARGIN = 1.55;
const BOUNDARY_HIT_COOLDOWN_MS = 4000;
const CAMERA_POSITION: [number, number, number] = [0, 5.4, 25.0];
const CAMERA_FRONT_PLAYABLE_MARGIN = 1.2;
const MOVEMENT_INPUT_DEADZONE = 0.12;
const SHOULD_LOG_STATE_TRANSITIONS = process.env.NODE_ENV !== "production";
const DEV_DUPLICATE_RESET_WINDOW_MS = 500;

type LastRuntimeResetSnapshot = {
  sceneId: string;
  respawnSignal: number;
  spawn: [number, number, number];
  at: number;
};

let lastRuntimeResetSnapshot: LastRuntimeResetSnapshot | null = null;

function logRuntimeState(event: string, payload: Record<string, unknown>) {
  if (!SHOULD_LOG_STATE_TRANSITIONS) return;
  if (typeof window !== "undefined") {
    const nextEntry = { scope: "runtime", event, payload, ts: Date.now() };
    const currentTrace = ((window as unknown as { __gameTrace?: unknown[] }).__gameTrace ?? []);
    (window as unknown as { __gameTrace: unknown[] }).__gameTrace = [...currentTrace, nextEntry].slice(-300);
  }
  console.info(`[runtime-state] ${event}`, payload);
}

function applyDeadzone(value: number, threshold: number) {
  return Math.abs(value) < threshold ? 0 : value;
}

function resolveAction(horizontal: number, vertical: number): MovementAction {
  if (horizontal === 0 && vertical === 0) return "idle";
  const angle = Math.atan2(Math.abs(vertical), Math.abs(horizontal));
  if (angle >= VERTICAL_ANGLE_THRESHOLD) {
    return vertical < 0 ? "north" : "south";
  }
  return horizontal < 0 ? "west" : "east";
}

function getWallAxes(rotationY: number) {
  return {
    axisX: new Vector2(Math.cos(rotationY), -Math.sin(rotationY)),
    axisZ: new Vector2(Math.sin(rotationY), Math.cos(rotationY)),
  };
}

function projectDistance(originX: number, originZ: number, pointX: number, pointZ: number, axis: Vector2) {
  return (pointX - originX) * axis.x + (pointZ - originZ) * axis.y;
}

export function GameTouchSpriteRuntime({
  activeCharacter,
  debug,
  showDebugGround,
  showDebugWalls,
  showPlayerCollider = false,
  wallOpacityMode = "wireframe",
  wallInteractionsEnabled = true,
  wallToolMode,
  wallPointResetSignal,
  speechText,
  speechVisible,
  speechTrigger,
  speechCharsPerSecond,
  onSpeechLetterSound,
  onBoundaryHit,
  onSpeechDismiss,
  onRuntimeEvent,
  // DI props for demo-specific dependencies
  getMobileInput = () => ({ active: false, x: 0, z: 0 }),
  addWallWithData,
  getPhrase = () => "",
  selectedWallIndex = null,
  onSelectWall,
  updateSelectedWall,
  disableClickToMove = false,
  getEffectiveClickGoal,
}: {
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
  getMobileInput?: () => { active: boolean; x: number; z: number };
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
  updateSelectedWall?: (
    updater: (wall: GameSceneWall) => GameSceneWall,
  ) => void;
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
  getEffectiveClickGoal?: (
    clickX: number,
    clickZ: number,
    playerX: number,
    playerZ: number,
  ) => { x: number; z: number } | null | undefined;
}) {
  const spriteRef = useRef<DavidSpriteHandle | null>(null);
  const meshRef = useRef<Mesh>(null);
  const characterBodyRef = useRef<RapierRigidBody>(null);
  const characterColliderRef = useRef<RapierCollider | null>(null);
  const colliderWireframeRef = useRef<Mesh>(null);
  // Reusable vectors for per-frame collider mutation (avoids allocation in useFrame).
  const colliderHalfExtentsRef = useRef(new Vector3(0.55, 0.95, 0.18));
  const colliderTranslationRef = useRef(new Vector3(0, 0, 0));
  const currentActionRef = useRef<MovementAction>("idle");
  const currentInputModeRef = useRef<"auto" | "keyboard" | "joystick">("auto");
  const hadManualInputRef = useRef(false);
  const lastPublishedPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastResetRef = useRef<{ sceneId: string; respawnSignal: number } | null>(null);
  const [action, setAction] = useState<MovementAction>("idle");
  const [wallPointPreviewState, setWallPointPreviewState] = useState<WallPointPreview | null>(null);
  const wallInteractionRef = useRef<WallInteraction>(null);
  const wallPointStartRef = useRef<WallPointStart | null>(null);
  const lastBoundaryHitRef = useRef<number>(0);
  const lastStuckHitRef = useRef<number>(0);

  const playerSpawn = useSceneStore((s) => s.scene.playerSpawn);
  const playerPosition = useSceneStore((s) => s.playerPosition);
  const playerWalkingState = useSceneStore((s) => s.playerWalkingState);
  // if (playerWalkingState?.isActive) {
  //   console.log(`[GameTouchSpriteRuntime] walk state active, points=${playerWalkingState.pathPoints.length}`);
  // }
  const sceneId = useSceneStore((s) => s.sceneId);
  const ground = useSceneStore((s) => s.scene.ground);
  const setPlayerPosition = useSceneStore((s) => s.setPlayerPosition);
  const respawnSignal = useSceneStore((s) => s.respawnSignal);

  // Keep a ref to walk state so the completion callback captures the latest value.
  const playerWalkingStateRef = useRef(playerWalkingState);
  useEffect(() => { playerWalkingStateRef.current = playerWalkingState; }, [playerWalkingState]);

  // When the walk animation completes, teleport the physics body to the target
  // so the sprite doesn't snap back to its original position.
  const handleWalkComplete = useCallback(() => {
    const target = playerWalkingStateRef.current?.targetPosition;
    const body = characterBodyRef.current;
    if (target && body) {
      body.setTranslation({ x: target[0], y: target[1], z: target[2] }, true);
    }
  }, []);

  // Use walk animation if active, otherwise use current player position
  const { animatedPosition, isWalking } = usePlayerWalkAnimation(playerPosition, playerWalkingState, undefined, handleWalkComplete);
  const renderPosition = isWalking ? animatedPosition : playerPosition;

  const { setTarget, setRoute, cancelTarget, resolveDirection, registerProgress } = useClickToMoveController();
  const { clearPressedKeys, getKeyboardMovement } = useKeyboardMovementInput();

  const playableBounds = useMemo(() => {
    const minX = ground.minX + PLAYER_BOUND_MARGIN;
    const maxX = ground.maxX - PLAYER_BOUND_MARGIN;
    const minZ = ground.minZ + PLAYER_BOUND_MARGIN;
    const maxZByGround = ground.maxZ - PLAYER_BOUND_MARGIN;
    const maxZByCamera = CAMERA_POSITION[2] - CAMERA_FRONT_PLAYABLE_MARGIN;
    const maxZ = Math.min(maxZByGround, maxZByCamera);

    return {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
    };
  }, [ground.maxX, ground.maxZ, ground.minX, ground.minZ]);

  const clampToPlayableArea = useCallback((x: number, z: number) => {
    return {
      x: MathUtils.clamp(x, playableBounds.minX, playableBounds.maxX),
      z: MathUtils.clamp(z, playableBounds.minZ, playableBounds.maxZ),
    };
  }, [playableBounds.maxX, playableBounds.maxZ, playableBounds.minX, playableBounds.minZ]);

  const handleClickWorld = useCallback((x: number, z: number) => {
    if (wallInteractionRef.current) return;

    if (debug && wallToolMode === "points") {
      const clamped = clampToPlayableArea(x, z);
      const clickedPoint = new Vector2(clamped.x, clamped.z);
      const startPoint =
        wallPointStartRef.current?.resetSignal === wallPointResetSignal
          ? wallPointStartRef.current.point
          : null;

      if (!startPoint) {
        wallPointStartRef.current = { point: clickedPoint, resetSignal: wallPointResetSignal };
        setWallPointPreviewState({ start: clickedPoint, end: clickedPoint, resetSignal: wallPointResetSignal });
        return;
      }

      const dx = clickedPoint.x - startPoint.x;
      const dz = clickedPoint.y - startPoint.y;
      const length = Math.sqrt(dx * dx + dz * dz);

      if (length < MIN_WALL_HALF_EXTENT * 2) {
        setWallPointPreviewState({ start: startPoint, end: clickedPoint, resetSignal: wallPointResetSignal });
        return;
      }

      // Default wall height matches addWall in sceneEditorStore — tall enough
      // that a subsequent default opening (full-height minus a thin lintel)
      // clears the character sprite's worst-case height.
      const halfHeight = 4;
      const halfThickness = 0.25;
      const centerX = (startPoint.x + clickedPoint.x) / 2;
      const centerZ = (startPoint.y + clickedPoint.y) / 2;
      const rotationY = -Math.atan2(dz, dx);

      addWallWithData?.({
        position: [centerX, ground.y + halfHeight, centerZ],
        rotationY,
        halfSize: [Math.max(MIN_WALL_HALF_EXTENT, length / 2), halfHeight, halfThickness],
      });

      wallPointStartRef.current = { point: clickedPoint, resetSignal: wallPointResetSignal };
      setWallPointPreviewState({ start: clickedPoint, end: clickedPoint, resetSignal: wallPointResetSignal });
      return;
    }

    if (disableClickToMove) return;

    const clamped = clampToPlayableArea(x, z);
    const body = characterBodyRef.current;
    const scene = useSceneStore.getState().scene;
    const startPosition = body?.translation() ?? { x: playerSpawn[0], z: playerSpawn[2] };

    // Check if clicked on a transition collider zone
    const transitionMatch = resolveTransitionFromClickOnCollider(scene, clamped.x, clamped.z);
    const clickGoal = transitionMatch ? { x: transitionMatch.position[0], z: transitionMatch.position[2] } : clamped;

    // Give the host app a chance to redirect the goal. Typical use: when
    // the click points past a closed door, snap to the door's approach
    // point on the player's side instead of letting A* hunt for a long
    // way around the wall.
    const redirected = getEffectiveClickGoal?.(
      clickGoal.x,
      clickGoal.z,
      startPosition.x,
      startPosition.z,
    );
    const effectiveGoal = redirected ?? clickGoal;

    const pathArgs = {
      bounds: playableBounds,
      walls: scene.walls,
      interactions: scene.interactions,
    };
    const startPt = { x: startPosition.x, z: startPosition.z };

    const route = findPath({ start: startPt, goal: effectiveGoal, ...pathArgs });

    if (route && route.length > 0) {
      setRoute(route);
      return;
    }

    // Path blocked: nudge the goal toward the player in cellSize steps and try
    // again. This navigates the character as close as possible to the clicked
    // point without walking through obstacles.
    const dx = startPt.x - effectiveGoal.x;
    const dz = startPt.z - effectiveGoal.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0) {
      const STEP = 0.9; // ≈ pathfinding cellSize
      const maxSteps = Math.min(8, Math.floor(dist / STEP));
      for (let step = 1; step <= maxSteps; step++) {
        const t = (step * STEP) / dist;
        const nudgedGoal = { x: effectiveGoal.x + dx * t, z: effectiveGoal.z + dz * t };
        const fallback = findPath({ start: startPt, goal: nudgedGoal, ...pathArgs });
        if (fallback && fallback.length > 0) {
          setRoute(fallback);
          return;
        }
      }
    }

    // Truly unreachable — notify the host so it can react (e.g. play a blocked sfx).
    emitRuntimeEvent(onRuntimeEvent, {
      type: "onCollide",
      reason: "pathblocked",
      position: [effectiveGoal.x, ground.y, effectiveGoal.z],
    });
  }, [addWallWithData, clampToPlayableArea, debug, disableClickToMove, getEffectiveClickGoal, ground.y, onRuntimeEvent, playableBounds, playerSpawn, setRoute, wallPointResetSignal, wallToolMode]);

  const stopWallInteraction = useCallback(() => {
    wallInteractionRef.current = null;
  }, []);

  const handleStartWallMove = useCallback((index: number, pointX: number, pointZ: number) => {
    const wall = useSceneStore.getState().scene.walls[index];
    if (!wall) return;
    wallInteractionRef.current = {
      mode: "move",
      index,
      offsetX: pointX - wall.position[0],
      offsetZ: pointZ - wall.position[2],
    };
  }, []);

  const handleStartWallResize = useCallback((index: number, handle: WallResizeHandle) => {
    onSelectWall?.(index);
    wallInteractionRef.current = {
      mode: "resize",
      index,
      handle,
    };
  }, [onSelectWall]);

  const handleHoverWorld = useCallback((x: number, z: number) => {
    const interaction = wallInteractionRef.current;
    if (!interaction) return;
    if (!updateSelectedWall) return;

    // Read the wall via the interaction's own index — NOT the DI
    // `selectedWallIndex` prop. The latter is captured by closure and lags
    // behind the store by one render cycle, so the very first `onPointerMove`
    // after a click sees the stale value `null` and the drag never starts.
    const sceneState = useSceneStore.getState();
    const wall = sceneState.scene.walls[interaction.index];
    if (!wall) return;

    if (interaction.mode === "move") {
      const nextX = x - interaction.offsetX;
      const nextZ = z - interaction.offsetZ;
      updateSelectedWall((prev) => ({
        ...prev,
        position: [nextX, prev.position[1], nextZ],
      }));
      return;
    }

    // resize: project the cursor onto the wall's local X (length) or Z (thickness)
    // axis, halve the resulting distance from the wall's center, and clamp to
    // a sane minimum. The wall's center stays fixed during resize.
    const rotationY = wall.rotationY ?? 0;
    const { axisX, axisZ } = getWallAxes(rotationY);
    const projX = projectDistance(wall.position[0], wall.position[2], x, z, axisX);
    const projZ = projectDistance(wall.position[0], wall.position[2], x, z, axisZ);

    updateSelectedWall((prev) => {
      const halfSize = [...prev.halfSize] as [number, number, number];
      switch (interaction.handle) {
        case "x+":
          halfSize[0] = Math.max(MIN_WALL_HALF_EXTENT, projX);
          break;
        case "x-":
          halfSize[0] = Math.max(MIN_WALL_HALF_EXTENT, -projX);
          break;
        case "z+":
          halfSize[2] = Math.max(MIN_WALL_HALF_EXTENT, projZ);
          break;
        case "z-":
          halfSize[2] = Math.max(MIN_WALL_HALF_EXTENT, -projZ);
          break;
      }
      return { ...prev, halfSize };
    });
  }, [updateSelectedWall]);

  const handleHoverPointWallTool = useCallback((x: number, z: number) => {
    if (!debug || wallToolMode !== "points") return;
    const startPoint =
      wallPointStartRef.current?.resetSignal === wallPointResetSignal
        ? wallPointStartRef.current.point
        : null;
    if (!startPoint) return;
    const clamped = clampToPlayableArea(x, z);
    setWallPointPreviewState({
      start: startPoint,
      end: new Vector2(clamped.x, clamped.z),
      resetSignal: wallPointResetSignal,
    });
  }, [clampToPlayableArea, debug, wallPointResetSignal, wallToolMode]);

  const characterClips = useMemo(
    () => GAME_CHARACTER_SPRITES[activeCharacter],
    [activeCharacter],
  );
  const characterAnimations = useMemo(
    () => [...Object.values(characterClips), DAVE_IDLE_SPEAKING],
    [characterClips],
  );
  const activeAnimation = useMemo(
    () =>
      speechVisible && action === "idle"
        ? buildSpeakingAnimation(speechTrigger, speechCharsPerSecond)
        : characterClips[action],
    [speechVisible, action, characterClips, speechTrigger, speechCharsPerSecond],
  );

  useEffect(() => {
    const body = characterBodyRef.current;
    if (!body) return;
    const spawn = useSceneStore.getState().scene.playerSpawn;
    const previousReset = lastResetRef.current;
    const reason = !previousReset
      ? "initial-mount"
      : previousReset.sceneId !== sceneId
        ? "scene-change"
        : "respawn";

    logRuntimeState("player-reset", {
      reason,
      sceneId,
      respawnSignal,
      spawn,
    });

    const now = Date.now();
    const duplicateDevMountReset = SHOULD_LOG_STATE_TRANSITIONS
      && (reason === "initial-mount" || reason === "respawn")
      && lastRuntimeResetSnapshot != null
      && now - lastRuntimeResetSnapshot.at < DEV_DUPLICATE_RESET_WINDOW_MS
      && lastRuntimeResetSnapshot.sceneId === sceneId
      && lastRuntimeResetSnapshot.respawnSignal === respawnSignal
      && lastRuntimeResetSnapshot.spawn[0] === spawn[0]
      && lastRuntimeResetSnapshot.spawn[1] === spawn[1]
      && lastRuntimeResetSnapshot.spawn[2] === spawn[2];

    if (duplicateDevMountReset) {
      logRuntimeState("player-reset-skipped", {
        reason: "duplicate-dev-reset",
        originalReason: reason,
        sceneId,
        respawnSignal,
        spawn,
      });
      lastResetRef.current = { sceneId, respawnSignal };
      return;
    }

    body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    cancelTarget();
    clearPressedKeys();
    setPlayerPosition([spawn[0], spawn[1], spawn[2]]);
    lastPublishedPositionRef.current = { x: spawn[0], y: spawn[1], z: spawn[2] };
    lastResetRef.current = { sceneId, respawnSignal };
    lastRuntimeResetSnapshot = {
      sceneId,
      respawnSignal,
      spawn: [spawn[0], spawn[1], spawn[2]],
      at: now,
    };
  }, [cancelTarget, clearPressedKeys, sceneId, respawnSignal, setPlayerPosition]);

  useEffect(() => {
    window.addEventListener("pointerup", stopWallInteraction);
    return () => {
      window.removeEventListener("pointerup", stopWallInteraction);
    };
  }, [stopWallInteraction]);

  useFrame((_, delta) => {
    const body = characterBodyRef.current;

    if (!body) {
      return;
    }

    const { moveLeft, moveRight, moveUp, moveDown, anyKeyPressed } = getKeyboardMovement();

    const joystick = getMobileInput();
    // Block input during walk animation
    const inputBlocked = isWalking;
    const manualInputActive = (anyKeyPressed || joystick.active) && !inputBlocked;
    const nextInputMode: "auto" | "keyboard" | "joystick" = joystick.active
      ? "joystick"
      : anyKeyPressed
        ? "keyboard"
        : "auto";

    if (currentInputModeRef.current !== nextInputMode) {
      logRuntimeState("input-mode-change", {
        from: currentInputModeRef.current,
        to: nextInputMode,
        sceneId,
      });
      currentInputModeRef.current = nextInputMode;
    }

    if (manualInputActive && !hadManualInputRef.current) {
      cancelTarget();
      logRuntimeState("click-move-cancelled", {
        reason: "manual-input",
        inputMode: nextInputMode,
        sceneId,
      });
    }
    hadManualInputRef.current = manualInputActive;

    let horizontal = 0;
    let vertical = 0;

    // During walk animation, ignore all input (joystick, keyboard, auto-move)
    if (!inputBlocked) {
      if (joystick.active) {
        horizontal = joystick.x;
        vertical = joystick.z;
      } else if (anyKeyPressed) {
        horizontal = Number(moveRight) - Number(moveLeft);
        vertical = Number(moveDown) - Number(moveUp);
      } else {
        const currentPosition = body.translation();
        const autoMove = resolveDirection(
          currentPosition.x,
          currentPosition.z,
          delta,
          manualInputActive,
        );
        horizontal = autoMove.horizontal;
        vertical = autoMove.vertical;

        if (autoMove.snapToTarget) {
          body.setTranslation(
            {
              x: autoMove.snapToTarget.x,
              y: currentPosition.y,
              z: autoMove.snapToTarget.z,
            },
            true,
          );
        }
      }
    }

    horizontal = applyDeadzone(horizontal, MOVEMENT_INPUT_DEADZONE);
    vertical = applyDeadzone(vertical, MOVEMENT_INPUT_DEADZONE);

    // During walk animation, calculate direction from current to target position
    let nextAction: MovementAction;
    if (isWalking && playerWalkingState?.targetPosition) {
      const currentPos = [animatedPosition[0], animatedPosition[2]];
      const targetPos = [playerWalkingState.targetPosition[0], playerWalkingState.targetPosition[2]];
      const dx = targetPos[0] - currentPos[0];
      const dz = targetPos[1] - currentPos[1];
      nextAction = resolveAction(dx, dz);
    } else {
      nextAction = resolveAction(horizontal, vertical);
    }

    if (currentActionRef.current !== nextAction) {
      logRuntimeState("action-change", {
        from: currentActionRef.current,
        to: nextAction,
        inputMode: currentInputModeRef.current,
        sceneId,
      });
      currentActionRef.current = nextAction;
      setAction(nextAction);
    }

    const speed = 7;
    const currentVelocity = body.linvel();
    const verticalSpeed = vertical !== 0 ? speed * 3 : speed;
    const targetVelocity = {
      x: horizontal * speed,
      y: currentVelocity.y,
      z: vertical * verticalSpeed,
    };

    if (horizontal === 0 && vertical === 0) {
      body.setLinvel({ x: 0, y: currentVelocity.y, z: 0 }, true);
    } else {
      body.setLinvel(targetVelocity, true);
    }

    const currentPosition = body.translation();
    const clampedPosition = clampToPlayableArea(currentPosition.x, currentPosition.z);
    const wasClampedX = clampedPosition.x !== currentPosition.x;
    const wasClampedZ = clampedPosition.z !== currentPosition.z;
    if (wasClampedX || wasClampedZ) {
      body.setTranslation({ x: clampedPosition.x, y: currentPosition.y, z: clampedPosition.z }, true);
      const vel = body.linvel();
      body.setLinvel(
        {
          x: wasClampedX
            ? (currentPosition.x > clampedPosition.x ? Math.min(0, vel.x) : Math.max(0, vel.x))
            : vel.x,
          y: vel.y,
          z: wasClampedZ
            ? (currentPosition.z > clampedPosition.z ? Math.min(0, vel.z) : Math.max(0, vel.z))
            : vel.z,
        },
        true,
      );

      const now = performance.now();
      if (now - lastBoundaryHitRef.current > BOUNDARY_HIT_COOLDOWN_MS) {
        lastBoundaryHitRef.current = now;
        emitRuntimeEvent(onRuntimeEvent, {
          type: "onCollide",
          reason: "boundary",
          position: [clampedPosition.x, currentPosition.y, clampedPosition.z],
        });
      }
    }

    const safePosition = body.translation();

    const { stuck } = registerProgress(
      safePosition.x,
      safePosition.z,
      delta,
      manualInputActive,
    );

    if (stuck) {
      const vel = body.linvel();
      body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
      // Cancel the route so the character doesn't keep trying to reach an
      // unreachable destination (e.g. blocked by a wall with no valid path).
      cancelTarget();
      const now = performance.now();
      if (now - lastStuckHitRef.current > BOUNDARY_HIT_COOLDOWN_MS) {
        lastStuckHitRef.current = now;
        emitRuntimeEvent(onRuntimeEvent, {
          type: "onCollide",
          reason: "stuck",
          position: [safePosition.x, safePosition.y, safePosition.z],
        });
      }
    }

    const depthFactor = MathUtils.clamp(
      MathUtils.inverseLerp(DEPTH_FAR_Z, DEPTH_NEAR_Z, safePosition.z),
      0,
      1,
    );

    const roundedX = Number(safePosition.x.toFixed(2));
    const roundedY = Number(safePosition.y.toFixed(2));
    const roundedZ = Number(safePosition.z.toFixed(2));
    const lastLogged = lastPublishedPositionRef.current;
    if (!lastLogged || lastLogged.x !== roundedX || lastLogged.y !== roundedY || lastLogged.z !== roundedZ) {
      lastPublishedPositionRef.current = { x: roundedX, y: roundedY, z: roundedZ };
      setPlayerPosition([roundedX, roundedY, roundedZ]);
      emitRuntimeEvent(onRuntimeEvent, {
        type: "onMove",
        position: [roundedX, roundedY, roundedZ],
        action: nextAction,
      });
    }

    const spriteScale = MathUtils.lerp(SPRITE_MIN_SCALE, SPRITE_MAX_SCALE, depthFactor);
    if (meshRef.current) {
      const flipX = action === "west" ? -1 : 1;
      meshRef.current.scale.set(spriteScale * flipX, spriteScale, 1);
      meshRef.current.position.y = spriteScale - 0.95;
    }

    // The player sprite plane is `planeHeight=2` units tall, scaled by
    // `spriteScale` and offset to keep its feet at local Y=-0.95. Match the
    // physics collider to that exact box so the player can't slip through
    // openings that visually wouldn't let them past.
    //   bottom (local Y) = -0.95   (foot, fixed)
    //   top    (local Y) =  2 * spriteScale - 0.95
    //   halfY  = spriteScale
    //   center = spriteScale - 0.95
    const collider = characterColliderRef.current;
    if (collider) {
      colliderHalfExtentsRef.current.set(0.55, spriteScale, 0.18);
      collider.setHalfExtents(colliderHalfExtentsRef.current);
      colliderTranslationRef.current.set(0, spriteScale - 0.95, 0);
      collider.setTranslationWrtParent(colliderTranslationRef.current);
    }
    if (colliderWireframeRef.current) {
      colliderWireframeRef.current.scale.set(1, spriteScale, 1);
      colliderWireframeRef.current.position.y = spriteScale - 0.95;
    }
  });

  const wallPointPreview =
    debug && wallToolMode === "points" && wallPointPreviewState?.resetSignal === wallPointResetSignal
      ? wallPointPreviewState
      : null;

  return (
    <>
      <SceneGround
        onClickWorld={handleClickWorld}
        onHoverWorld={
          debug
            ? (x, z) => {
              handleHoverWorld(x, z);
              handleHoverPointWallTool(x, z);
            }
            : undefined
        }
        debug={debug && showDebugGround}
        depthNearZ={DEPTH_NEAR_Z}
        depthFarZ={DEPTH_FAR_Z}
      />
      <SceneWalls
        debug={debug && showDebugWalls}
        opacityMode={wallOpacityMode}
        interactionsEnabled={wallInteractionsEnabled}
        onStartWallMove={handleStartWallMove}
        onStartWallResize={handleStartWallResize}
        selectedWallIndex={selectedWallIndex}
        onSelectWall={onSelectWall}
      />
      {debug && wallToolMode === "points" && (
        <SceneWallPointPreview preview={wallPointPreview} groundY={ground.y} />
      )}
      <SceneCollisionSphere />
      <RigidBody
        ref={characterBodyRef}
        type="dynamic"
        colliders={false}
        position={renderPosition}
        gravityScale={1.2}
        linearDamping={7}
        angularDamping={20}
        ccd
        enabledRotations={[false, false, false]}
      >
        <CuboidCollider
          ref={characterColliderRef}
          args={[0.55, 0.95, 0.18]}
          friction={2.2}
          restitution={0}
        />
        {debug && showPlayerCollider && (
          // box base height = 2; the useFrame above scales Y to `spriteScale`
          // and offsets Y position so the wireframe exactly mirrors the
          // physics collider (whose halfY is also set to `spriteScale`).
          <mesh ref={colliderWireframeRef} raycast={() => null}>
            <boxGeometry args={[1.1, 2, 0.36]} />
            <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.85} />
          </mesh>
        )}
        <DavidSprite
          ref={spriteRef}
          meshRef={meshRef}
          animation={activeAnimation}
          preloadAnimations={characterAnimations}
          scale={[SPRITE_MIN_SCALE, SPRITE_MIN_SCALE, 1]}
          isPaused={false}
        />
        <SpeechBubble
          key={speechTrigger}
          text={speechText}
          visible={speechVisible}
          trigger={speechTrigger}
          charsPerSecond={speechCharsPerSecond}
          onDismiss={onSpeechDismiss}
          onLetterRevealed={onSpeechLetterSound}
        />
      </RigidBody>
    </>
  );
}
