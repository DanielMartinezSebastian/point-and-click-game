"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useReducer, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { MathUtils, Vector3 } from "three";
import DavidSprite from "../sprite/DavidSprite";
import { GAME_CHARACTER_SPRITES } from "../sprite/clips";
// Mismos valores que GameTouchSpriteRuntime para que la escala por profundidad sea idéntica.
const DEPTH_FAR_Z = -16;
const DEPTH_NEAR_Z = 8;
const SPRITE_MIN_SCALE = 1.4;
const SPRITE_MAX_SCALE = 2.94;
/** Suscribe a la store (re-render en cada cambio). */
function useRemotePlayers(store) {
    const [, force] = useReducer((x) => x + 1, 0);
    useEffect(() => store.subscribe(() => force()), [store]);
    return store.getAll();
}
function RemotePlayerSprite({ player }) {
    const bodyRef = useRef(null);
    const meshRef = useRef(null);
    // target = posición de física recibida por red (~12 Hz)
    const target = useRef(new Vector3(player.position[0], player.position[1], player.position[2]));
    // smoothPos = posición interpolada que se aplica al body kinematic cada frame
    const smoothPos = useRef(new Vector3(player.position[0], player.position[1], player.position[2]));
    // Actualiza el objetivo cada render (presence llega throttled ~12 Hz).
    target.current.set(player.position[0], player.position[1], player.position[2]);
    const sprites = GAME_CHARACTER_SPRITES[player.characterId] ?? GAME_CHARACTER_SPRITES.Dave;
    const animation = sprites[player.action] ?? sprites.idle;
    useFrame((_, dt) => {
        const body = bodyRef.current;
        const m = meshRef.current;
        if (!body || !m)
            return;
        // Lerp suave hacia la posición objetivo.
        const t = Math.min(1, dt * 10);
        smoothPos.current.x += (target.current.x - smoothPos.current.x) * t;
        smoothPos.current.y += (target.current.y - smoothPos.current.y) * t;
        smoothPos.current.z += (target.current.z - smoothPos.current.z) * t;
        // Mueve el cuerpo kinematic — Rapier propaga la colisión con el player local.
        body.setNextKinematicTranslation(smoothPos.current);
        // Escala por profundidad (igual que GameTouchSpriteRuntime).
        const depthFactor = MathUtils.clamp((target.current.z - DEPTH_FAR_Z) / (DEPTH_NEAR_Z - DEPTH_FAR_Z), 0, 1);
        const s = MathUtils.lerp(SPRITE_MIN_SCALE, SPRITE_MAX_SCALE, depthFactor);
        // Offset Y del sprite dentro del RigidBody: mismo que el player local.
        m.position.y = s - 0.95;
        const flipX = animation.flipX ? -1 : 1;
        m.scale.set(flipX * s, s, 1);
    });
    return (_jsxs(RigidBody, { ref: bodyRef, type: "kinematicPosition", colliders: false, position: [player.position[0], player.position[1], player.position[2]], enabledRotations: [false, false, false], children: [_jsx(CuboidCollider, { args: [0.55, 0.95, 0.18], friction: 0.05, restitution: 0 }), _jsx(DavidSprite, { animation: animation, meshRef: meshRef, isPaused: player.action === "idle" })] }));
}
/** Dibuja los avatares de los demás jugadores en la escena actual. */
export function RemotePlayers({ store, currentSceneId }) {
    const players = useRemotePlayers(store);
    const inScene = players.filter((p) => p.sceneId === currentSceneId);
    return (_jsx(_Fragment, { children: inScene.map((p) => (_jsx(RemotePlayerSprite, { player: p }, p.playerId))) }));
}
//# sourceMappingURL=RemotePlayers.js.map