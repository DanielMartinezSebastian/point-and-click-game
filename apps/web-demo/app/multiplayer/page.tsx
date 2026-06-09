"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import GameTouchCanvas from "../components/GameTouchCanvas";
import { RemotePlayers } from "@pointclick-engine/engine-renderer-r3f";
import { useSceneStore, generateRandomName } from "@pointclick-engine/engine-core";
import { SCENES } from "../../demo-content/scenes/scenes";
import type { GameSceneConfig } from "../lib/engine/publicApi";
import {
  createMultiplayerRuntime,
  type MultiplayerRuntime,
} from "../lib/net/createMultiplayerRuntime";
import { createRoomSession } from "../lib/net/roomSession";
import { localStorageAdapter } from "../lib/platform-web";
import { RoomLobby } from "../components/net/RoomLobby";

const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

export default function MultiplayerPage() {
  const room = useMemo(() => createRoomSession(localStorageAdapter), []);
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState(() => generateRandomName());
  const mpRef = useRef<MultiplayerRuntime | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const sceneId = useSceneStore((s) => s.sceneId);

  useEffect(() => {
    if (!code) return;
    const mp = createMultiplayerRuntime({
      room: code,
      host: HOST,
      displayName: name,
      scenes: Object.values(SCENES) as GameSceneConfig[],
    });
    mpRef.current = mp;
    const unsub = mp.remotePlayers.subscribe(() => force()); // refresca el contador N/4
    return () => {
      unsub();
      mp.dispose();
      mpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const remoteCount = mpRef.current?.remotePlayers.getInScene(sceneId).length ?? 0;

  return (
    <>
      <GameTouchCanvas
        extraCanvasChildren={
          mpRef.current ? (
            <RemotePlayers
              store={mpRef.current.remotePlayers}
              currentSceneId={sceneId}
            />
          ) : null
        }
      />
      <RoomLobby
        code={code}
        remoteCount={remoteCount}
        capacity={room.capacity}
        displayName={name}
        onCreate={() => setCode(room.create())}
        onJoin={(c) => {
          try {
            setCode(room.join(c));
          } catch {
            alert("código inválido");
          }
        }}
        onReset={() => setCode(room.reset())}
        onRename={(n) => {
          setName(n);
          mpRef.current?.setName(n);
        }}
      />
    </>
  );
}
