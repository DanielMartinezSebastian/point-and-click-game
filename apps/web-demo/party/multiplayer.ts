import type * as Party from "partykit/server";

const MAX_PLAYERS = 4;

/**
 * Servidor PartyKit de la partida. Es la autoridad: mantiene el snapshot del
 * world, hace fan-out de los sobres y aplica el límite de capacidad (4).
 *
 * room.id = código de partida (ver app/lib/net/roomSession.ts).
 */
export default class MultiplayerServer implements Party.Server {
  /** Snapshot LWW del world (registros `${entityId}:${field}` → {value,ts,by}). */
  private world: Record<string, unknown> = {};

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const count = [...this.room.getConnections()].length; // incluye a `conn`
    if (count > MAX_PLAYERS) {
      conn.send(
        JSON.stringify({
          kind: "status",
          payload: { state: "disconnected", reason: "room-full" },
        }),
      );
      conn.close();
      return;
    }
    // 1) snapshot del world  2) status connected con el id asignado
    conn.send(
      JSON.stringify({
        v: 1,
        room: this.room.id,
        from: "server",
        ts: Date.now(),
        kind: "snapshot",
        payload: this.world,
      }),
    );
    conn.send(
      JSON.stringify({
        kind: "status",
        payload: { state: "connected", selfId: conn.id },
      }),
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    let env: { kind?: string; payload?: unknown };
    try {
      env = JSON.parse(message);
    } catch {
      return;
    }
    if (env.kind === "event") this.applyWorldEvent(env.payload);
    // fan-out a todos menos el emisor
    this.room.broadcast(message, [sender.id]);
  }

  onClose(conn: Party.Connection) {
    this.room.broadcast(
      JSON.stringify({
        v: 1,
        room: this.room.id,
        from: conn.id,
        ts: Date.now(),
        kind: "presence",
        payload: { playerId: conn.id, __left: true },
      }),
    );
  }

  /** Aplica un evento world al snapshot (item placed/removed). */
  private applyWorldEvent(payload: unknown) {
    const e = payload as {
      type?: string;
      itemId?: string;
      outcome?: string;
      interactionId?: string;
      placedItem?: unknown;
    };
    if (e?.type === "item:dropped" && e.itemId) {
      const key = `item:${e.itemId}:placed`;
      if (e.outcome === "place") {
        // Store full item data so late joiners can reconstruct the scene.
        this.world[key] = {
          value: true,
          placedItem: e.placedItem,
          ts: Date.now(),
          by: "server",
        };
      } else {
        this.world[key] = { value: false, ts: Date.now(), by: "server" };
      }
    }
  }
}
