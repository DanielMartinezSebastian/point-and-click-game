# Task 08-transport-adapters-and-vercel

**Effort**: 2 days | **Blocks**: 10,11 | **Blocked by**: 01

---

## 🎯 Objetivo

Implementar el adapter real del `MultiplayerPort` sobre **PartyKit** (server-authoritative, host de
la room, autoridad del world, cap 4) y documentar el despliegue en Vercel/serverless.

---

## 📁 Archivos

- **CREAR** `apps/web-demo/party/multiplayer.ts` (servidor PartyKit)
- **CREAR** `apps/web-demo/partykit.json` (config)
- **CREAR** `apps/web-demo/app/lib/net/partyKitAdapter.ts` (cliente, implementa `MultiplayerPort`)
- **EDITAR** `apps/web-demo/package.json` (dep `partykit` + `partysocket`, script `party:dev`)
- **CREAR** `apps/web-demo/.env.local.example` (`NEXT_PUBLIC_PARTYKIT_HOST`)

---

## ✅ Success Criteria

- [ ] El cliente implementa `MultiplayerPort` (connect/disconnect/send/onMessage/onStatus)
- [ ] El servidor hace fan-out a todos menos al emisor y manda snapshot al unirse
- [ ] Capacidad 4 aplicada: el 5º connect recibe `status disconnected reason:"room-full"` y se cierra
- [ ] Smoke test: dos pestañas (PartyKit dev local) intercambian presence + un evento world
- [ ] Vercel documentado (conexión persistente fuera de funciones serverless)

---

## 📝 Step 1 — Servidor `party/multiplayer.ts`

```ts
import type * as Party from "partykit/server";

const MAX_PLAYERS = 4;

export default class MultiplayerServer implements Party.Server {
  /** Snapshot LWW del world (registros `${entityId}:${field}` → {value,ts,by}). */
  private world: Record<string, unknown> = {};

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const count = [...this.room.getConnections()].length; // incluye a `conn`
    if (count > MAX_PLAYERS) {
      conn.send(JSON.stringify({ kind: "status", payload: { state: "disconnected", reason: "room-full" } }));
      conn.close();
      return;
    }
    // 1) snapshot del world  2) status connected con el id asignado
    conn.send(JSON.stringify({ v: 1, room: this.room.id, from: "server", ts: Date.now(), kind: "snapshot", payload: this.world }));
    conn.send(JSON.stringify({ kind: "status", payload: { state: "connected", selfId: conn.id } }));
  }

  onMessage(message: string, sender: Party.Connection) {
    let env: { kind: string; payload?: unknown };
    try { env = JSON.parse(message); } catch { return; }
    if (env.kind === "event") this.applyWorldEvent(env.payload);
    // fan-out a todos menos el emisor
    this.room.broadcast(message, [sender.id]);
  }

  onClose(conn: Party.Connection) {
    this.room.broadcast(JSON.stringify({ v: 1, room: this.room.id, from: conn.id, ts: Date.now(), kind: "presence", payload: { playerId: conn.id, __left: true } }));
  }

  /** Aplica un evento world al snapshot (door open, item placed/removed). Simplificado. */
  private applyWorldEvent(payload: unknown) {
    const e = payload as { type?: string; itemId?: string; outcome?: string };
    if (e?.type === "item:dropped" && e.itemId) {
      const key = `item:${e.itemId}:placed`;
      this.world[key] = { value: e.outcome === "place", ts: Date.now(), by: "server" };
    }
    // Extiende para puertas/interaction-state según las escenas de la demo.
  }
}
```

## 📝 Step 2 — `partykit.json`
```json
{
  "name": "pointclick-multiplayer",
  "main": "party/multiplayer.ts",
  "parties": { "multiplayer": "party/multiplayer.ts" },
  "compatibilityDate": "2024-01-01"
}
```

## 📝 Step 3 — Cliente `app/lib/net/partyKitAdapter.ts`

```ts
import PartySocket from "partysocket";
import type {
  MultiplayerPort, NetEnvelope, ConnectOptions, ConnectionStatus,
} from "@pointclick-engine/engine-core";

/** Adapter PartyKit. `host` = NEXT_PUBLIC_PARTYKIT_HOST (p.ej. "127.0.0.1:1999" en dev). */
export function createPartyKitAdapter(host: string): MultiplayerPort {
  let socket: PartySocket | null = null;
  let msgHandlers: Array<(m: NetEnvelope) => void> = [];
  let statusHandlers: Array<(s: ConnectionStatus) => void> = [];

  return {
    connect(opts: ConnectOptions) {
      statusHandlers.forEach((h) => h({ state: "connecting" }));
      socket = new PartySocket({ host, party: "multiplayer", room: opts.room });
      socket.addEventListener("message", (e: MessageEvent) => {
        let env: any;
        try { env = JSON.parse(e.data); } catch { return; }
        if (env.kind === "status") { statusHandlers.forEach((h) => h(env.payload)); return; }
        msgHandlers.forEach((h) => h(env as NetEnvelope));
      });
      socket.addEventListener("close", () => statusHandlers.forEach((h) => h({ state: "disconnected" })));
    },
    disconnect() { socket?.close(); socket = null; },
    send(m: NetEnvelope) { socket?.send(JSON.stringify(m)); },
    onMessage(h) { msgHandlers.push(h); return () => { msgHandlers = msgHandlers.filter((x) => x !== h); }; },
    onStatus(h) { statusHandlers.push(h); return () => { statusHandlers = statusHandlers.filter((x) => x !== h); }; },
  };
}
```

## 📝 Step 4 — deps y scripts
`apps/web-demo/package.json`: añade deps `"partykit"`, `"partysocket"`; script:
```json
"party:dev": "partykit dev"
```
`.env.local.example`:
```
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
```

## 📝 Step 5 — Despliegue Vercel (documentar)

- **Next.js (la demo) se despliega en Vercel** sin cambios.
- **El servidor PartyKit NO va en Vercel**: las funciones serverless/edge de Vercel no mantienen
  conexiones WebSocket persistentes ni estado en memoria entre invocaciones. PartyKit corre en
  Cloudflare (Durable Objects): `npx partykit deploy` → te da un host `https://<proj>.<user>.partykit.dev`.
- En Vercel define `NEXT_PUBLIC_PARTYKIT_HOST=<proj>.<user>.partykit.dev`. El cliente apunta ahí.
- Alternativas (mismo `MultiplayerPort`, no implementar ahora): Liveblocks (storage LWW + presence),
  o un WS microservicio propio en Fly.io/Railway. WebRTC P2P queda como opción avanzada.

## ✅ Verificación
`npm run party:dev` (terminal 1) + `npm run dev` (terminal 2). Dos pestañas en `/multiplayer` con
el mismo código de room se ven y comparten un evento world. El 5º cliente recibe `room-full`.

## 📚 References
- `docs/architecture/09-multiplayer.md` §6–§7
- PartyKit docs: `Party.Server`, `room.broadcast`, `getConnections`
- `packages/engine-core/src/ports/multiplayer.ts` (contrato a implementar)
