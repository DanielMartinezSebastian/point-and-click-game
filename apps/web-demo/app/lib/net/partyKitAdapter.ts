import { PartySocket } from "partysocket";
import type {
  MultiplayerPort,
  NetEnvelope,
  ConnectOptions,
  ConnectionStatus,
} from "@pointclick-engine/engine-core";

/** Adapter PartyKit. `host` = NEXT_PUBLIC_PARTYKIT_HOST (p.ej. "127.0.0.1:1999" en dev). */
export function createPartyKitAdapter(host: string): MultiplayerPort {
  let socket: PartySocket | null = null;
  let msgHandlers: Array<(m: NetEnvelope) => void> = [];
  let statusHandlers: Array<(s: ConnectionStatus) => void> = [];

  return {
    connect(opts: ConnectOptions) {
      statusHandlers.forEach((h) => h({ state: "connecting" }));
      // Pass our stable UUID as the PartyKit party-key so conn.id on the
      // server equals selfId. Without this, PartySocket generates its own ID,
      // the server echoes it back as status.selfId, MultiplayerSession updates
      // self.playerId to the new ID, and subsequent presences look like a
      // second player to peers who already stored the initial UUID-based entry.
      socket = new PartySocket({ host, party: "multiplayer", room: opts.room, id: opts.selfId });
      socket.addEventListener("message", (e: MessageEvent) => {
        let env: { kind?: string; payload?: unknown };
        try {
          env = JSON.parse(e.data as string);
        } catch {
          return;
        }
        if (env.kind === "status") {
          statusHandlers.forEach((h) => h(env.payload as ConnectionStatus));
          return;
        }
        msgHandlers.forEach((h) => h(env as NetEnvelope));
      });
      socket.addEventListener("close", () =>
        statusHandlers.forEach((h) => h({ state: "disconnected" })),
      );
    },
    disconnect() {
      socket?.close();
      socket = null;
    },
    send(m: NetEnvelope) {
      socket?.send(JSON.stringify(m));
    },
    onMessage(h) {
      msgHandlers.push(h);
      return () => {
        msgHandlers = msgHandlers.filter((x) => x !== h);
      };
    },
    onStatus(h) {
      statusHandlers.push(h);
      return () => {
        statusHandlers = statusHandlers.filter((x) => x !== h);
      };
    },
  };
}
