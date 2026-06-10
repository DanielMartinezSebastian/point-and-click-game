import { NET_PROTOCOL_VERSION } from "../../ports/multiplayer";
import { EVENT_CLASSIFICATION, shouldReplicate, isWorld } from "./eventClassification";
import { throttleTrailing } from "./throttle";
export function createMultiplayerSession(opts) {
    const { port, bus, room, remotePlayers, applyRemoteEvent } = opts;
    const now = opts.now ?? (() => Date.now());
    let self = { ...opts.self };
    let applyingRemote = false; // ⟵ anti-bucle: true mientras aplicamos algo recibido
    const wrap = (kind, payload) => ({
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
    const clock = opts.clock ?? {
        now: () => Date.now(),
        schedule: (cb, d) => {
            setTimeout(cb, d);
        },
    };
    const throttleMs = opts.presenceThrottleMs ?? 80;
    const sendPresence = throttleMs > 0 ? throttleTrailing(rawSendPresence, throttleMs, clock) : rawSendPresence;
    // ── Salida: suscribe a TODOS los tipos de evento ────────────────────────────
    const types = Object.keys(EVENT_CLASSIFICATION);
    const unsubs = types.map((type) => bus.on(type, (event) => {
        if (applyingRemote)
            return; // no re-difundir lo aplicado desde la red
        if (!shouldReplicate(type))
            return; // private → nunca sale
        if (isWorld(type)) {
            port.send(wrap("event", event));
        }
        if (type === "player:moved") {
            const e = event;
            self = { ...self, position: e.position, action: e.action };
            sendPresence();
        }
        else if (type === "scene:changed") {
            self = {
                ...self,
                sceneId: event.sceneId,
            };
            sendPresence();
        }
        else if (type === "transition:completed") {
            self = {
                ...self,
                sceneId: event
                    .toSceneId,
            };
            sendPresence();
        }
    }));
    // ── Entrada: aplica envelopes remotos ───────────────────────────────────────
    const offMsg = port.onMessage((m) => {
        if (m.from === self.playerId)
            return; // defensivo (headless ya filtra self)
        if (m.kind === "presence") {
            const d = m.payload;
            if (d.__left) {
                remotePlayers.remove(d.playerId);
                bus.emit({ type: "net:playerLeft", playerId: d.playerId });
                return;
            }
            const isNew = remotePlayers.getAll().every((p) => p.playerId !== d.playerId);
            remotePlayers.upsert(d);
            if (isNew)
                bus.emit({ type: "net:playerJoined", player: d });
        }
        else if (m.kind === "event") {
            applyingRemote = true;
            try {
                applyRemoteEvent(m.payload);
            }
            finally {
                applyingRemote = false;
            }
        }
        else if (m.kind === "claim-result") {
            const r = m.payload;
            if (r.granted)
                opts.reconciler?.confirm(r.entityId);
            else
                opts.reconciler?.reject(r.entityId);
        }
        else if (m.kind === "snapshot") {
            opts.reconciler?.onSnapshot();
            opts.applySnapshot?.(m.payload);
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
    // Heartbeat: mantiene la presence viva aunque el jugador esté inactivo.
    // El receptor solo descartará al jugador si supera el stale threshold (p.ej. 10 min).
    const heartbeatMs = opts.heartbeatMs ?? 30000;
    const heartbeatTimer = heartbeatMs > 0 ? setInterval(rawSendPresence, heartbeatMs) : null;
    return {
        dispose: () => {
            if (heartbeatTimer !== null)
                clearInterval(heartbeatTimer);
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
//# sourceMappingURL=MultiplayerSession.js.map