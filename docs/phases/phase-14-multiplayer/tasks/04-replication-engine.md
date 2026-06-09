# Task 04-replication-engine

**Effort**: 2 days | **Blocks**: 05,06,11 | **Blocked by**: 01,02,03

---

## 🎯 Objetivo

`MultiplayerSession`: capa de core que puentea el bus de eventos (`on`/`emit`) con el
`MultiplayerPort`. Salida: eventos world/presence → `NetEnvelope`. Entrada: envelopes remotos →
mutaciones marcadas `remote` (sin re-difundir = anti-bucle).

---

## 📁 Archivos

- **EDITAR** `packages/engine-core/src/game/events/types.ts` (eventos `net:*`)
- **EDITAR** `packages/engine-core/src/game/commands/types.ts` (comandos `net:*`)
- **EDITAR** `packages/engine-core/src/game/net/eventClassification.ts` (clasificar `net:*`)
- **CREAR** `packages/engine-core/src/game/net/MultiplayerSession.ts`
- **CREAR** `packages/engine-core/src/__tests__/multiplayerSession.test.ts`
- **EDITAR** `packages/engine-core/src/game/net/index.ts`

---

## ✅ Success Criteria

- [ ] `createMultiplayerSession(opts)` devuelve `{ dispose, getSelf, updateSelf }`
- [ ] Evento `world` local (`item:dropped`) → llega y se aplica en la otra sesión
- [ ] Evento `private` local (`dialog:triggered`) → **NO** viaja
- [ ] Evento remoto aplicado **no se re-difunde** (test de "no eco")
- [ ] `presence` entrante → `remotePlayers.upsert`; nuevo jugador → emite `net:playerJoined` local
- [ ] Tests con dos sesiones + `InMemoryHub` verdes

---

## 📝 Step 1 — Tipos `net:*`

En `game/events/types.ts`, añade imports y variantes a la union `GameEvent`:
```ts
import type { PlayerDescriptor, PlayerId } from "../net/playerIdentity";
import type { ConnectionStatus } from "../../ports/multiplayer";
// ... dentro de la union GameEvent:
  | { type: "net:playerJoined"; player: PlayerDescriptor }
  | { type: "net:playerLeft"; playerId: PlayerId }
  | { type: "net:status"; status: ConnectionStatus }
```

En `game/commands/types.ts`, añade a la union `GameCommand`:
```ts
  | { type: "net:join"; room: string; displayName?: string }
  | { type: "net:leave" }
  | { type: "net:setName"; displayName: string }
```

En `eventClassification.ts`, añade al mapa (son locales, no se replican):
```ts
  "net:playerJoined": ["private"],
  "net:playerLeft": ["private"],
  "net:status": ["private"],
```

## 📝 Step 2 — `game/net/MultiplayerSession.ts`

```ts
import type { GameEvent, GameEventType } from "../events/types";
import type { MultiplayerPort, NetEnvelope, RoomId } from "../../ports/multiplayer";
import { NET_PROTOCOL_VERSION } from "../../ports/multiplayer";
import type { PlayerDescriptor } from "./playerIdentity";
import type { RemotePlayersStore } from "./remotePlayersStore";
import { EVENT_CLASSIFICATION, shouldReplicate, isWorld } from "./eventClassification";

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
  /** Reloj lógico para `ts`. Default Date.now (task 05 inyecta HLC). */
  now?: () => number;
}

export interface MultiplayerSession {
  dispose: () => void;
  getSelf: () => PlayerDescriptor;
  /** Actualiza el descriptor local y difunde presence (usado por task 06/setName). */
  updateSelf: (patch: Partial<PlayerDescriptor>) => void;
}

export function createMultiplayerSession(opts: MultiplayerSessionOptions): MultiplayerSession {
  const { port, bus, room, remotePlayers, applyRemoteEvent } = opts;
  const now = opts.now ?? (() => Date.now());
  let self = { ...opts.self };
  let applyingRemote = false; // ⟵ anti-bucle: true mientras aplicamos algo recibido

  const wrap = (kind: NetEnvelope["kind"], payload: unknown): NetEnvelope => ({
    v: NET_PROTOCOL_VERSION, room, from: self.playerId, ts: now(), kind, payload,
  });

  const sendPresence = () => {
    self = { ...self, lastSeenTs: now() };
    port.send(wrap("presence", self));
  };

  // ── Salida: suscribe a TODOS los tipos de evento ────────────────────────────
  const types = Object.keys(EVENT_CLASSIFICATION) as GameEventType[];
  const unsubs = types.map((type) =>
    bus.on(type, (event) => {
      if (applyingRemote) return;              // no re-difundir lo aplicado desde la red
      if (!shouldReplicate(type)) return;      // private → nunca sale
      if (isWorld(type)) {
        port.send(wrap("event", event));
      }
      // presence: actualiza self según el evento y difunde
      if (type === "player:moved") {
        const e = event as Extract<GameEvent, { type: "player:moved" }>;
        self = { ...self, position: e.position, action: e.action };
        sendPresence();
      } else if (type === "scene:changed") {
        self = { ...self, sceneId: (event as Extract<GameEvent, { type: "scene:changed" }>).sceneId };
        sendPresence();
      } else if (type === "transition:completed") {
        self = { ...self, sceneId: (event as Extract<GameEvent, { type: "transition:completed" }>).toSceneId };
        sendPresence();
      }
    }),
  );

  // ── Entrada: aplica envelopes remotos ───────────────────────────────────────
  const offMsg = port.onMessage((m) => {
    if (m.from === self.playerId) return; // defensivo (headless ya filtra self)
    if (m.kind === "presence") {
      const d = m.payload as PlayerDescriptor;
      const isNew = remotePlayers.getAll().every((p) => p.playerId !== d.playerId);
      remotePlayers.upsert(d);
      if (isNew) bus.emit({ type: "net:playerJoined", player: d });
    } else if (m.kind === "event") {
      applyingRemote = true;
      try { applyRemoteEvent(m.payload as GameEvent); }
      finally { applyingRemote = false; }
    }
    // "snapshot"/"claim"/"claim-result" → task 05/06/10
  });

  const offStatus = port.onStatus((status) => {
    bus.emit({ type: "net:status", status });
    if (status.state === "connected" && status.selfId) {
      self = { ...self, playerId: status.selfId };
    }
  });

  port.connect({ room, selfId: self.playerId });
  sendPresence(); // anúnciate al entrar

  return {
    dispose: () => { unsubs.forEach((u) => u()); offMsg(); offStatus(); port.disconnect(); },
    getSelf: () => self,
    updateSelf: (patch) => { self = { ...self, ...patch }; sendPresence(); },
  };
}
```

## 📝 Step 3 — export
En `game/net/index.ts`: `export * from "./MultiplayerSession";`

## 📝 Step 4 — Test `__tests__/multiplayerSession.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { InMemoryHub, HeadlessMultiplayerAdapter } from "../ports/headlessMultiplayer";
import { createMultiplayerSession } from "../game/net/MultiplayerSession";
import { createRemotePlayersStore } from "../game/net/remotePlayersStore";
import { createSelfDescriptor } from "../game/net/playerIdentity";
import type { GameEvent, GameEventType } from "../game/events/types";

// Bus de test: registro por tipo + emit que invoca a los listeners de ese tipo.
function makeBus() {
  const map = new Map<GameEventType, Array<(e: GameEvent) => void>>();
  return {
    on: (t: GameEventType, h: (e: GameEvent) => void) => {
      const arr = map.get(t) ?? []; arr.push(h); map.set(t, arr);
      return () => map.set(t, (map.get(t) ?? []).filter((x) => x !== h));
    },
    emit: (e: GameEvent) => (map.get(e.type) ?? []).forEach((h) => h(e)),
  };
}

function peer(hub: InMemoryHub, id: string, applied: GameEvent[]) {
  const bus = makeBus();
  const remotePlayers = createRemotePlayersStore();
  const session = createMultiplayerSession({
    port: new HeadlessMultiplayerAdapter(hub, id),
    bus, room: "r1", remotePlayers,
    self: createSelfDescriptor({ playerId: id, sceneId: "town", position: [0, 0, 0], displayName: id }),
    applyRemoteEvent: (e) => { applied.push(e); bus.emit(e); }, // re-emite al bus local
    now: () => 1,
  });
  return { bus, remotePlayers, session };
}

describe("MultiplayerSession", () => {
  it("replicates a world event to the other peer", () => {
    const hub = new InMemoryHub();
    const appliedB: GameEvent[] = [];
    const a = peer(hub, "A", []); const b = peer(hub, "B", appliedB);
    a.bus.emit({ type: "item:dropped", itemId: "key", outcome: "place" });
    expect(appliedB).toContainEqual({ type: "item:dropped", itemId: "key", outcome: "place" });
  });

  it("does NOT replicate a private event", () => {
    const hub = new InMemoryHub();
    const appliedB: GameEvent[] = [];
    const a = peer(hub, "A", []); peer(hub, "B", appliedB);
    a.bus.emit({ type: "dialog:triggered", text: "hi", source: "test" });
    expect(appliedB).toHaveLength(0);
  });

  it("does not echo a remote-applied event back to the wire", () => {
    const hub = new InMemoryHub();
    const appliedA: GameEvent[] = []; const appliedB: GameEvent[] = [];
    const a = peer(hub, "A", appliedA); const b = peer(hub, "B", appliedB);
    a.bus.emit({ type: "item:dropped", itemId: "key", outcome: "place" });
    // B aplicó 1; A no debe recibir el eco de vuelta (applied solo lo que A originó: 0)
    expect(appliedB.filter((e) => e.type === "item:dropped")).toHaveLength(1);
    expect(appliedA.filter((e) => e.type === "item:dropped")).toHaveLength(0);
  });

  it("upserts remote presence and emits net:playerJoined", () => {
    const hub = new InMemoryHub();
    const joined: GameEvent[] = [];
    const a = peer(hub, "A", []);
    a.bus.on("net:playerJoined", (e) => joined.push(e));
    peer(hub, "B", []); // B se conecta → manda presence
    expect(a.remotePlayers.getInScene("town").some((p) => p.playerId === "B")).toBe(true);
    expect(joined.some((e) => e.type === "net:playerJoined")).toBe(true);
  });
});
```

## ✅ Verificación
`npm test -w packages/engine-core` verde. `npm run build -w packages/engine-core` compila.

## 📚 References
- `apps/web-demo/app/lib/engine/publicApi.ts` (el handle `GameRuntime` ya cumple `SessionBus`)
- `packages/engine-core/src/events/EventBus.ts`
- `docs/architecture/09-multiplayer.md` §1–§3
