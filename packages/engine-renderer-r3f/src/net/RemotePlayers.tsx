"use client";
import { useEffect, useReducer, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Mesh } from "three";
import DavidSprite from "../sprite/DavidSprite";
import { GAME_CHARACTER_SPRITES } from "../sprite/clips";
import type {
  PlayerDescriptor,
  RemotePlayersStore,
} from "@pointclick-engine/engine-core";

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
      return;
    }
    m.position.lerp(target.current, Math.min(1, dt * 10)); // suavizado a 60fps
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
