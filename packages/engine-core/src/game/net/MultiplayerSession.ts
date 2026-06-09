import type { GameEvent, GameEventType } from "../events/types";
import type { MultiplayerPort, NetEnvelope, RoomId } from "../../ports/multiplayer";
import { NET_PROTOCOL_VERSION } from "../../ports/multiplayer";
import type { PlayerDescriptor } from "./playerIdentity";
import type { RemotePlayersStore } from "./remotePlayersStore";
import { EVENT_CLASSIFICATION, shouldReplicate, isWorld } from "./eventClassification";
import { throttleTrailing, type ThrottleClock } from "./throttle";
import type { OptimisticReconciler } from "./optimistic";

/** Bus mínimo que la sesión necesita (lo cumple el handle de createGameRuntime). */
export interface SessionBus {
  on: (type: GameEventType, handler: (e: GameEvent) => void) => () => void;
  emit: (event: GameEvent) => void;
}

export interface MultiplayerSessionOptions {
  port: MultiplayerPort;
  bus: SessionBus;
  room: RoomId;
  self: PlayerDescriptor;
  remotePlayers: RemotePlayersStore;
  /** Aplica un evento world remoto al estado local (el host lo cablea a los stores). */
  applyRemoteEvent: (event: GameEvent) => void;
  /** Reloj lógico para `ts`. Default Date.now (task 05 puede inyectar HLC). */
  now?: () => number;
  /** ms entre envíos de presence. Default 80 (~12.5 Hz). 0 = sin throttle. */
  presenceThrottleMs?: number;
  /** Reloj/scheduler para el throttle (inyectable en tests). */
  clock?: ThrottleClock;
  /** Reconciliador optimista (task 09) para claim-result/snapshot. */
  reconciler?: OptimisticReconciler;
}

export interface MultiplayerSession {
  dispose: () => void;
  getSelf: () => PlayerDescriptor;
  /** Actualiza el descriptor local y difunde presence (usado por setName/task 06). */
  updateSelf: (patch: Partial<PlayerDescriptor>) => void;
}

export function createMultiplayerSession(
  opts: MultiplayerSessionOptions,
): MultiplayerSession {
  const { port, bus, room, remotePlayers, applyRemoteEvent } = opts;
  const now = opts.now ?? (() => Date.now());
  let self = { ...opts.self };
  let applyingRemote = false; // ⟵ anti-bucle: true mientras aplicamos algo recibido

  const wrap = (kind: NetEnvelope["kind"], payload: unknown): NetEnvelope => ({
    v: NET_PROTOCOL_VERSION,
    room,
    from: self.playerId,
    ts: now(),
    kind,
    payload,
  });

  const rawSendPresence = () => {
    self = { ...self, lastSeenTs: now() };
    port.send(wrap("presence", self));
  };

  const clock: ThrottleClock = opts.clock ?? {
    now: () => Date.now(),
    schedule: (cb, d) => {
      setTimeout(cb, d);
    },
  };
  const throttleMs = opts.presenceThrottleMs ?? 80;
  const sendPresence =
    throttleMs > 0 ? throttleTrailing(rawSendPresence, throttleMs, clock) : rawSendPresence;

  // ── Salida: suscribe a TODOS los tipos de evento ────────────────────────────
  const types = Object.keys(EVENT_CLASSIFICATION) as GameEventType[];
  const unsubs = types.map((type) =>
    bus.on(type, (event) => {
      if (applyingRemote) return; // no re-difundir lo aplicado desde la red
      if (!shouldReplicate(type)) return; // private → nunca sale
      if (isWorld(type)) {
        port.send(wrap("event", event));
      }
      if (type === "player:moved") {
        const e = event as Extract<GameEvent, { type: "player:moved" }>;
        self = { ...self, position: e.position, action: e.action };
        sendPresence();
      } else if (type === "scene:changed") {
        self = {
          ...self,
          sceneId: (event as Extract<GameEvent, { type: "scene:changed" }>).sceneId,
        };
        sendPresence();
      } else if (type === "transition:completed") {
        self = {
          ...self,
          sceneId: (event as Extract<GameEvent, { type: "transition:completed" }>)
            .toSceneId,
        };
        sendPresence();
      }
    }),
  );

  // ── Entrada: aplica envelopes remotos ───────────────────────────────────────
  const offMsg = port.onMessage((m) => {
    if (m.from === self.playerId) return; // defensivo (headless ya filtra self)
    if (m.kind === "presence") {
      const d = m.payload as PlayerDescriptor & { __left?: boolean };
      if (d.__left) {
        remotePlayers.remove(d.playerId);
        bus.emit({ type: "net:playerLeft", playerId: d.playerId });
        return;
      }
      const isNew = remotePlayers.getAll().every((p) => p.playerId !== d.playerId);
      remotePlayers.upsert(d);
      if (isNew) bus.emit({ type: "net:playerJoined", player: d });
    } else if (m.kind === "event") {
      applyingRemote = true;
      try {
        applyRemoteEvent(m.payload as GameEvent);
      } finally {
        applyingRemote = false;
      }
    } else if (m.kind === "claim-result") {
      const r = m.payload as { entityId: string; granted: boolean };
      if (r.granted) opts.reconciler?.confirm(r.entityId);
      else opts.reconciler?.reject(r.entityId);
    } else if (m.kind === "snapshot") {
      opts.reconciler?.onSnapshot();
    }
  });

  const offStatus = port.onStatus((status) => {
    bus.emit({ type: "net:status", status });
    if (status.state === "connected" && status.selfId) {
      self = { ...self, playerId: status.selfId };
    }
  });

  port.connect({ room, selfId: self.playerId });
  rawSendPresence(); // anúnciate al entrar (inmediato, sin throttle)

  return {
    dispose: () => {
      unsubs.forEach((u) => u());
      offMsg();
      offStatus();
      port.disconnect();
    },
    getSelf: () => self,
    updateSelf: (patch) => {
      self = { ...self, ...patch };
      sendPresence();
    },
  };
}
