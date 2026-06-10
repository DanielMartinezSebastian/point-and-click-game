"use client";
import { useState } from "react";

export interface RoomLobbyProps {
  code: string | null;
  remoteCount: number; // otros jugadores en mi escena
  capacity: number; // 4
  displayName: string;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onReset: () => void;
  onRename: (name: string) => void;
}

export function RoomLobby(p: RoomLobbyProps) {
  const [joinCode, setJoinCode] = useState("");
  const total = p.remoteCount + 1;
  const missing = p.capacity - total;
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 1000,
        background: "#0f1220cc",
        color: "#e6e9ff",
        padding: 12,
        borderRadius: 8,
        font: "12px monospace",
        minWidth: 200,
      }}
    >
      {!p.code ? (
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={p.onCreate}>Crear partida</button>
          <input
            placeholder="código"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button onClick={() => p.onJoin(joinCode)} disabled={joinCode.length < 6}>
            Unirse
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div>
            Room: <b>{p.code}</b>{" "}
            <button onClick={() => navigator.clipboard?.writeText(p.code!)}>
              copiar
            </button>
          </div>
          <div>
            Jugadores:{" "}
            <b>
              {total}/{p.capacity}
            </b>
          </div>
          {missing > 0 && (
            <div style={{ color: "#ffd166" }}>Faltan {missing} jugador(es)…</div>
          )}
          <input value={p.displayName} onChange={(e) => p.onRename(e.target.value)} />
          <button onClick={p.onReset}>Reset room (nueva)</button>
        </div>
      )}
    </div>
  );
}
