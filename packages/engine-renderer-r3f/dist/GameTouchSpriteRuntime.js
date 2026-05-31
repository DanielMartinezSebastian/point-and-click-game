"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { MathUtils, Vector2, Vector3 } from "three";
import SpeechBubble from "./SpeechBubble";
import DavidSprite from "./sprite/DavidSprite";
import { DAVE_IDLE_SPEAKING, GAME_CHARACTER_SPRITES, } from "./sprite/clips";
import { buildSpeakingAnimation } from "./sprite/speakingAnimation";
import { SceneCollisionSphere } from "./scene/SceneCollisionSphere";
import { SceneGround } from "./scene/SceneGround";
import { SceneWallPointPreview } from "./scene/SceneWallPointPreview";
import { SceneWalls } from "./scene/SceneWalls";
import { findPath, useSceneStore, emitRuntimeEvent, resolveTransitionFromClickOnCollider } from "@pointclick-engine/engine-core";
import { usePlayerWalkAnimation } from "./hooks/usePlayerWalkAnimation";
import { useClickToMoveController } from "./hooks/useClickToMoveController";
import { useKeyboardMovementInput } from "./adapters/useKeyboardMovementInput";
const VERTICAL_ANGLE_THRESHOLD = 55 * (Math.PI / 180);
const DEPTH_FAR_Z = -16;
const DEPTH_NEAR_Z = 8;
const SPRITE_MIN_SCALE = 1.4;
const SPRITE_MAX_SCALE = 2.94;
const MIN_WALL_HALF_EXTENT = 0.15;
const PLAYER_BOUND_MARGIN = 1.55;
const BOUNDARY_HIT_COOLDOWN_MS = 4000;
const CAMERA_POSITION = [0, 5.4, 25.0];
const CAMERA_FRONT_PLAYABLE_MARGIN = 1.2;
const MOVEMENT_INPUT_DEADZONE = 0.12;
const SHOULD_LOG_STATE_TRANSITIONS = process.env.NODE_ENV !== "production";
const DEV_DUPLICATE_RESET_WINDOW_MS = 500;
let lastRuntimeResetSnapshot = null;
function logRuntimeState(event, payload) {
    if (!SHOULD_LOG_STATE_TRANSITIONS)
        return;
    if (typeof window !== "undefined") {
        const nextEntry = { scope: "runtime", event, payload, ts: Date.now() };
        const currentTrace = (window.__gameTrace ?? []);
        window.__gameTrace = [...currentTrace, nextEntry].slice(-300);
    }
    console.info(`[runtime-state] ${event}`, payload);
}
function applyDeadzone(value, threshold) {
    return Math.abs(value) < threshold ? 0 : value;
}
function resolveAction(horizontal, vertical) {
    if (horizontal === 0 && vertical === 0)
        return "idle";
    const angle = Math.atan2(Math.abs(vertical), Math.abs(horizontal));
    if (angle >= VERTICAL_ANGLE_THRESHOLD) {
        return vertical < 0 ? "north" : "south";
    }
    return horizontal < 0 ? "west" : "east";
}
function getWallAxes(rotationY) {
    return {
        axisX: new Vector2(Math.cos(rotationY), -Math.sin(rotationY)),
        axisZ: new Vector2(Math.sin(rotationY), Math.cos(rotationY)),
    };
}
function projectDistance(originX, originZ, pointX, pointZ, axis) {
    return (pointX - originX) * axis.x + (pointZ - originZ) * axis.y;
}
export function GameTouchSpriteRuntime({ activeCharacter, debug, showDebugGround, showDebugWalls, showPlayerCollider = false, wallOpacityMode = "wireframe", wallInteractionsEnabled = true, wallToolMode, wallPointResetSignal, speechText, speechVisible, speechTrigger, speechCharsPerSecond, onSpeechLetterSound, onBoundaryHit, onSpeechDismiss, onRuntimeEvent, 
// DI props for demo-specific dependencies
getMobileInput = () => ({ active: false, x: 0, z: 0 }), addWallWithData, getPhrase = () => "", selectedWallIndex = null, onSelectWall, updateSelectedWall, disableClickToMove = false, getEffectiveClickGoal, }) {
    const spriteRef = useRef(null);
    const meshRef = useRef(null);
    const characterBodyRef = useRef(null);
    const characterColliderRef = useRef(null);
    const colliderWireframeRef = useRef(null);
    // Reusable vectors for per-frame collider mutation (avoids allocation in useFrame).
    const colliderHalfExtentsRef = useRef(new Vector3(0.55, 0.95, 0.18));
    const colliderTranslationRef = useRef(new Vector3(0, 0, 0));
    const currentActionRef = useRef("idle");
    const currentInputModeRef = useRef("auto");
    const hadManualInputRef = useRef(false);
    const lastPublishedPositionRef = useRef(null);
    const lastResetRef = useRef(null);
    const [action, setAction] = useState("idle");
    const [wallPointPreviewState, setWallPointPreviewState] = useState(null);
    const wallInteractionRef = useRef(null);
    const wallPointStartRef = useRef(null);
    const lastBoundaryHitRef = useRef(0);
    const lastStuckHitRef = useRef(0);
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
    // Use walk animation if active, otherwise use current player position
    const { animatedPosition, isWalking } = usePlayerWalkAnimation(playerPosition, playerWalkingState);
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
    const clampToPlayableArea = useCallback((x, z) => {
        return {
            x: MathUtils.clamp(x, playableBounds.minX, playableBounds.maxX),
            z: MathUtils.clamp(z, playableBounds.minZ, playableBounds.maxZ),
        };
    }, [playableBounds.maxX, playableBounds.maxZ, playableBounds.minX, playableBounds.minZ]);
    const handleClickWorld = useCallback((x, z) => {
        if (wallInteractionRef.current)
            return;
        if (debug && wallToolMode === "points") {
            const clamped = clampToPlayableArea(x, z);
            const clickedPoint = new Vector2(clamped.x, clamped.z);
            const startPoint = wallPointStartRef.current?.resetSignal === wallPointResetSignal
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
        if (disableClickToMove)
            return;
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
        const redirected = getEffectiveClickGoal?.(clickGoal.x, clickGoal.z, startPosition.x, startPosition.z);
        const effectiveGoal = redirected ?? clickGoal;
        const route = findPath({
            start: { x: startPosition.x, z: startPosition.z },
            goal: effectiveGoal,
            bounds: playableBounds,
            walls: scene.walls,
            interactions: scene.interactions,
        });
        if (route && route.length > 0) {
            setRoute(route);
            return;
        }
        setTarget(effectiveGoal.x, effectiveGoal.z);
    }, [addWallWithData, clampToPlayableArea, debug, disableClickToMove, getEffectiveClickGoal, ground.y, playableBounds, playerSpawn, setRoute, setTarget, wallPointResetSignal, wallToolMode]);
    const stopWallInteraction = useCallback(() => {
        wallInteractionRef.current = null;
    }, []);
    const handleStartWallMove = useCallback((index, pointX, pointZ) => {
        const wall = useSceneStore.getState().scene.walls[index];
        if (!wall)
            return;
        wallInteractionRef.current = {
            mode: "move",
            index,
            offsetX: pointX - wall.position[0],
            offsetZ: pointZ - wall.position[2],
        };
    }, []);
    const handleStartWallResize = useCallback((index, handle) => {
        onSelectWall?.(index);
        wallInteractionRef.current = {
            mode: "resize",
            index,
            handle,
        };
    }, [onSelectWall]);
    const handleHoverWorld = useCallback((x, z) => {
        const interaction = wallInteractionRef.current;
        if (!interaction)
            return;
        if (!updateSelectedWall)
            return;
        // Read the wall via the interaction's own index — NOT the DI
        // `selectedWallIndex` prop. The latter is captured by closure and lags
        // behind the store by one render cycle, so the very first `onPointerMove`
        // after a click sees the stale value `null` and the drag never starts.
        const sceneState = useSceneStore.getState();
        const wall = sceneState.scene.walls[interaction.index];
        if (!wall)
            return;
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
            const halfSize = [...prev.halfSize];
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
    const handleHoverPointWallTool = useCallback((x, z) => {
        if (!debug || wallToolMode !== "points")
            return;
        const startPoint = wallPointStartRef.current?.resetSignal === wallPointResetSignal
            ? wallPointStartRef.current.point
            : null;
        if (!startPoint)
            return;
        const clamped = clampToPlayableArea(x, z);
        setWallPointPreviewState({
            start: startPoint,
            end: new Vector2(clamped.x, clamped.z),
            resetSignal: wallPointResetSignal,
        });
    }, [clampToPlayableArea, debug, wallPointResetSignal, wallToolMode]);
    const characterClips = useMemo(() => GAME_CHARACTER_SPRITES[activeCharacter], [activeCharacter]);
    const characterAnimations = useMemo(() => [...Object.values(characterClips), DAVE_IDLE_SPEAKING], [characterClips]);
    const activeAnimation = useMemo(() => speechVisible && action === "idle"
        ? buildSpeakingAnimation(speechTrigger, speechCharsPerSecond)
        : characterClips[action], [speechVisible, action, characterClips, speechTrigger, speechCharsPerSecond]);
    useEffect(() => {
        const body = characterBodyRef.current;
        if (!body)
            return;
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
        const nextInputMode = joystick.active
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
            }
            else if (anyKeyPressed) {
                horizontal = Number(moveRight) - Number(moveLeft);
                vertical = Number(moveDown) - Number(moveUp);
            }
            else {
                const currentPosition = body.translation();
                const autoMove = resolveDirection(currentPosition.x, currentPosition.z, delta, manualInputActive);
                horizontal = autoMove.horizontal;
                vertical = autoMove.vertical;
                if (autoMove.snapToTarget) {
                    body.setTranslation({
                        x: autoMove.snapToTarget.x,
                        y: currentPosition.y,
                        z: autoMove.snapToTarget.z,
                    }, true);
                }
            }
        }
        horizontal = applyDeadzone(horizontal, MOVEMENT_INPUT_DEADZONE);
        vertical = applyDeadzone(vertical, MOVEMENT_INPUT_DEADZONE);
        // During walk animation, calculate direction from current to target position
        let nextAction;
        if (isWalking && playerWalkingState?.targetPosition) {
            const currentPos = [animatedPosition[0], animatedPosition[2]];
            const targetPos = [playerWalkingState.targetPosition[0], playerWalkingState.targetPosition[2]];
            const dx = targetPos[0] - currentPos[0];
            const dz = targetPos[1] - currentPos[1];
            nextAction = resolveAction(dx, dz);
        }
        else {
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
        }
        else {
            body.setLinvel(targetVelocity, true);
        }
        const currentPosition = body.translation();
        const clampedPosition = clampToPlayableArea(currentPosition.x, currentPosition.z);
        const wasClampedX = clampedPosition.x !== currentPosition.x;
        const wasClampedZ = clampedPosition.z !== currentPosition.z;
        if (wasClampedX || wasClampedZ) {
            body.setTranslation({ x: clampedPosition.x, y: currentPosition.y, z: clampedPosition.z }, true);
            const vel = body.linvel();
            body.setLinvel({
                x: wasClampedX
                    ? (currentPosition.x > clampedPosition.x ? Math.min(0, vel.x) : Math.max(0, vel.x))
                    : vel.x,
                y: vel.y,
                z: wasClampedZ
                    ? (currentPosition.z > clampedPosition.z ? Math.min(0, vel.z) : Math.max(0, vel.z))
                    : vel.z,
            }, true);
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
        const { stuck } = registerProgress(safePosition.x, safePosition.z, delta, manualInputActive);
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
        const depthFactor = MathUtils.clamp(MathUtils.inverseLerp(DEPTH_FAR_Z, DEPTH_NEAR_Z, safePosition.z), 0, 1);
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
    const wallPointPreview = debug && wallToolMode === "points" && wallPointPreviewState?.resetSignal === wallPointResetSignal
        ? wallPointPreviewState
        : null;
    return (_jsxs(_Fragment, { children: [_jsx(SceneGround, { onClickWorld: handleClickWorld, onHoverWorld: debug
                    ? (x, z) => {
                        handleHoverWorld(x, z);
                        handleHoverPointWallTool(x, z);
                    }
                    : undefined, debug: debug && showDebugGround, depthNearZ: DEPTH_NEAR_Z, depthFarZ: DEPTH_FAR_Z }), _jsx(SceneWalls, { debug: debug && showDebugWalls, opacityMode: wallOpacityMode, interactionsEnabled: wallInteractionsEnabled, onStartWallMove: handleStartWallMove, onStartWallResize: handleStartWallResize, selectedWallIndex: selectedWallIndex, onSelectWall: onSelectWall }), debug && wallToolMode === "points" && (_jsx(SceneWallPointPreview, { preview: wallPointPreview, groundY: ground.y })), _jsx(SceneCollisionSphere, {}), _jsxs(RigidBody, { ref: characterBodyRef, type: "dynamic", colliders: false, position: renderPosition, gravityScale: 1.2, linearDamping: 7, angularDamping: 20, ccd: true, enabledRotations: [false, false, false], children: [_jsx(CuboidCollider, { ref: characterColliderRef, args: [0.55, 0.95, 0.18], friction: 2.2, restitution: 0 }), debug && showPlayerCollider && (_jsxs("mesh", { ref: colliderWireframeRef, raycast: () => null, children: [_jsx("boxGeometry", { args: [1.1, 2, 0.36] }), _jsx("meshBasicMaterial", { color: "#00ffff", wireframe: true, transparent: true, opacity: 0.85 })] })), _jsx(DavidSprite, { ref: spriteRef, meshRef: meshRef, animation: activeAnimation, preloadAnimations: characterAnimations, scale: [SPRITE_MIN_SCALE, SPRITE_MIN_SCALE, 1], isPaused: false }), _jsx(SpeechBubble, { text: speechText, visible: speechVisible, trigger: speechTrigger, charsPerSecond: speechCharsPerSecond, onDismiss: onSpeechDismiss, onLetterRevealed: onSpeechLetterSound }, speechTrigger)] })] }));
}
//# sourceMappingURL=GameTouchSpriteRuntime.js.map