export class InMemoryHub {
    constructor() {
        this.peers = new Map();
    }
    register(id, room, inbound) {
        this.peers.set(id, { room, inbound });
        return () => this.peers.delete(id);
    }
    /** Fan-out a los peers de la MISMA room que el mensaje, menos al emisor. */
    broadcast(from, _room, message) {
        for (const [id, peer] of this.peers) {
            if (id === from)
                continue;
            if (peer.room !== message.room)
                continue; // aísla por room del receptor
            peer.inbound(message);
        }
    }
}
let _autoId = 0;
/** Adapter de loopback para tests. Implementa MultiplayerPort contra un InMemoryHub. */
export class HeadlessMultiplayerAdapter {
    constructor(hub, selfId) {
        this.hub = hub;
        this.room = "";
        this.connected = false;
        this.unregister = null;
        this.msgHandlers = [];
        this.statusHandlers = [];
        this.selfId = selfId ?? `headless-${++_autoId}`;
    }
    connect(opts) {
        this.room = opts.room;
        this.connected = true;
        this.unregister = this.hub.register(this.selfId, this.room, (m) => {
            this.msgHandlers.forEach((h) => h(m));
        });
        this.emitStatus({ state: "connected", selfId: this.selfId });
    }
    disconnect() {
        this.connected = false;
        this.unregister?.();
        this.unregister = null;
        this.emitStatus({ state: "disconnected" });
    }
    send(message) {
        if (!this.connected)
            return;
        this.hub.broadcast(this.selfId, this.room, message);
    }
    onMessage(handler) {
        this.msgHandlers.push(handler);
        return () => {
            this.msgHandlers = this.msgHandlers.filter((h) => h !== handler);
        };
    }
    onStatus(handler) {
        this.statusHandlers.push(handler);
        return () => {
            this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
        };
    }
    emitStatus(s) {
        this.statusHandlers.forEach((h) => h(s));
    }
}
//# sourceMappingURL=headlessMultiplayer.js.map