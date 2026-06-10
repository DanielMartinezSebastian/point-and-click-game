"use client";
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useReducer, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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
    const meshRef = useRef(null);
    const target = useRef(new Vector3(player.position[0], player.position[1], player.position[2]));
    const initialized = useRef(false);
    // Actualiza el objetivo cada render (presence llega throttled ~12Hz).
    target.current.set(player.position[0], player.position[1], player.position[2]);
    const sprites = GAME_CHARACTER_SPRITES[player.characterId] ?? GAME_CHARACTER_SPRITES.Dave;
    const animation = sprites[player.action] ?? sprites.idle;
    useFrame((_, dt) => {
        const m = meshRef.current;
        if (!m)
            return;
        // Escala por profundidad desde la posición OBJETIVO (igual que GameTouchSpriteRuntime).
        const depthFactor = MathUtils.clamp((target.current.z - DEPTH_FAR_Z) / (DEPTH_NEAR_Z - DEPTH_FAR_Z), 0, 1);
        const s = MathUtils.lerp(SPRITE_MIN_SCALE, SPRITE_MAX_SCALE, depthFactor);
        // El sprite local vive dentro de <RigidBody> con offset Y = (spriteScale - 0.95)
        // (ver GameTouchSpriteRuntime línea ~775: meshRef.current.position.y = spriteScale - 0.95).
        // Replicamos ese offset para que el avatar remoto coincida visualmente con el local.
        const tx = target.current.x;
        const ty = target.current.y + s - 0.95;
        const tz = target.current.z;
        if (!initialized.current) {
            m.position.set(tx, ty, tz);
            initialized.current = true;
        }
        else {
            const t = Math.min(1, dt * 10);
            m.position.x += (tx - m.position.x) * t;
            m.position.y += (ty - m.position.y) * t;
            m.position.z += (tz - m.position.z) * t;
        }
        const flipX = animation.flipX ? -1 : 1;
        m.scale.set(flipX * s, s, 1);
    });
    return (_jsx(DavidSprite, { animation: animation, meshRef: meshRef, isPaused: player.action === "idle" }));
}
/** Dibuja los avatares de los demás jugadores en la escena actual. */
export function RemotePlayers({ store, currentSceneId }) {
    const players = useRemotePlayers(store);
    const inScene = players.filter((p) => p.sceneId === currentSceneId);
    return (_jsx(_Fragment, { children: inScene.map((p) => (_jsx(RemotePlayerSprite, { player: p }, p.playerId))) }));
}
//# sourceMappingURL=RemotePlayers.js.map