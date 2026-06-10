import { createGameRuntime, type GameSceneConfig } from "../engine/publicApi";
import {
  createMultiplayerSession,
  createRemotePlayersStore,
  createSelfDescriptor,
  getSceneState,
  type GameEvent,
  type RemotePlayersStore,
} from "@pointclick-engine/engine-core";
import { createPartyKitAdapter } from "./partyKitAdapter";

export interface MultiplayerRuntime {
  remotePlayers: RemotePlayersStore;
  setName: (name: string) => void;
  dispose: () => void;
}

type RuntimeConfig = NonNullable<Parameters<typeof createGameRuntime>[0]>;

export function createMultiplayerRuntime(opts: {
  room: string;
  host: string;
  scenes: GameSceneConfig[];
  displayName: string;
  inventoryAdapter?: RuntimeConfig["inventoryAdapter"];
  dialogAdapter?: RuntimeConfig["dialogAdapter"];
}): MultiplayerRuntime {
  const runtime = createGameRuntime({
    scenes: opts.scenes,
    inventoryAdapter: opts.inventoryAdapter,
    dialogAdapter: opts.dialogAdapter,
  });
  const remotePlayers = createRemotePlayersStore();
  const port = createPartyKitAdapter(opts.host);
  const scene = getSceneState();

  const session = createMultiplayerSession({
    port,
    bus: runtime, // el handle cumple SessionBus (on/emit)
    room: opts.room,
    self: createSelfDescriptor({
      playerId: globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}`,
      sceneId: scene.sceneId,
      position: scene.playerPosition,
      displayName: opts.displayName,
    }),
    remotePlayers,
    // Re-emite el evento world remoto al bus local. La sesión activa `applyingRemote`
    // mientras corre esto, así que NO se vuelve a difundir (anti-bucle). Los suscriptores
    // del demo (audio, door… vía runtime.on) reaccionan al evento compartido.
    applyRemoteEvent: (event: GameEvent) => runtime.emit(event),
    presenceThrottleMs: 80,
  });

  // Limpia jugadores que no manden heartbeat en 10 min (o que cerraron la ventana,
  // que el servidor ya elimina vía __left inmediatamente).
  const STALE_MS = 10 * 60 * 1000;
  const prune = setInterval(() => remotePlayers.pruneStale(STALE_MS), 60_000);

  return {
    remotePlayers,
    setName: (name) => session.updateSelf({ displayName: name }),
    dispose: () => {
      clearInterval(prune);
      session.dispose();
      runtime.dispose();
    },
  };
}
