"use client";
import { useEffect, useReducer, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type Mesh } from "three";
import DavidSprite from "../sprite/DavidSprite";
import { GAME_CHARACTER_SPRITES } from "../sprite/clips";
import type {
  PlayerDescriptor,
  RemotePlayersStore,
} from "@pointclick-engine/engine-core";

// Mismos valores que GameTouchSpriteRuntime para que la escala por profundidad sea idéntica.
const DEPTH_FAR_Z = -16;
const DEPTH_NEAR_Z = 8;
const SPRITE_MIN_SCALE = 1.4;
const SPRITE_MAX_SCALE = 2.94;

/** Suscribe a la store (re-render en cada cambio). */
function useRemotePlayers(store: RemotePlayersStore): PlayerDescriptor[] {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => store.subscribe(() => force()), [store]);
  return store.getAll();
}

function RemotePlayerSprite({ player }: { player: PlayerDescriptor }) {
  const meshRef = useRef<Mesh>(null);
  const target = useRef(
    new Vector3(player.position[0], player.position[1], player.position[2]),
  );
  const initialized = useRef(false);

  // Actualiza el objetivo cada render (presence llega throttled ~12Hz).
  target.current.set(player.position[0], player.position[1], player.position[2]);

  const sprites =
    GAME_CHARACTER_SPRITES[player.characterId] ?? GAME_CHARACTER_SPRITES.Dave;
  const animation = sprites[player.action] ?? sprites.idle;

  useFrame((_, dt) => {
    const m = meshRef.current;
    if (!m) return;
    if (!initialized.current) {
      m.position.copy(target.current);
      initialized.current = true;
    } else {
      m.position.lerp(target.current, Math.min(1, dt * 10));
    }
    // Escala por profundidad: igual que el player local en GameTouchSpriteRuntime.
    const depthFactor = MathUtils.clamp(
      (m.position.z - DEPTH_FAR_Z) / (DEPTH_NEAR_Z - DEPTH_FAR_Z),
      0,
      1,
    );
    const s = MathUtils.lerp(SPRITE_MIN_SCALE, SPRITE_MAX_SCALE, depthFactor);
    const flipX = animation.flipX ? -1 : 1;
    m.scale.set(flipX * s, s, 1);
  });

  return (
    <DavidSprite
      animation={animation}
      meshRef={meshRef}
      isPaused={player.action === "idle"}
    />
  );
}

export interface RemotePlayersProps {
  store: RemotePlayersStore;
  currentSceneId: string;
}

/** Dibuja los avatares de los demás jugadores en la escena actual. */
export function RemotePlayers({ store, currentSceneId }: RemotePlayersProps) {
  const players = useRemotePlayers(store);
  const inScene = players.filter((p) => p.sceneId === currentSceneId);
  return (
    <>
      {inScene.map((p) => (
        <RemotePlayerSprite key={p.playerId} player={p} />
      ))}
    </>
  );
}
