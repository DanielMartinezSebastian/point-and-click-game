import { createGameRuntime, type GameSceneConfig } from "../engine/publicApi";
import {
  createMultiplayerSession,
  createRemotePlayersStore,
  createSelfDescriptor,
  getSceneState,
  type GameEvent,
  type PlacedSceneItem,
  type RemotePlayersStore,
} from "@pointclick-engine/engine-core";
import { usePlacedItemsStore } from "../../store/placedItemsStore";
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
    // Apply remote world events: update shared stores THEN emit to the bus
    // (audio, door logic, etc.). applyingRemote is already true here so the
    // session won't re-broadcast what we emit (anti-loop guard).
    applyRemoteEvent: (event: GameEvent) => {
      if (event.type === "item:dropped") {
        const store = usePlacedItemsStore.getState();
        if (event.outcome === "place" && event.placedItem) {
          store.addItem(event.placedItem);
        } else if (event.outcome === "pickup-success" && event.interactionId) {
          store.removeItemByInteractionId(event.interactionId);
        }
      }
      runtime.emit(event);
    },
    applySnapshot: (world: Record<string, unknown>) => {
      const store = usePlacedItemsStore.getState();
      for (const [key, raw] of Object.entries(world)) {
        if (!key.startsWith("item:") || !key.endsWith(":placed")) continue;
        const entry = raw as { value: boolean; placedItem?: PlacedSceneItem };
        if (entry.value && entry.placedItem) {
          store.addItem(entry.placedItem);
        }
      }
    },
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
