# Task 11-demo-multiplayer-route

**Effort**: 2 days | **Blocks**: 12 | **Blocked by**: 04,06,07,08,10 (05,09 para claim completo)

---

## 🎯 Objetivo

Crear la ruta **`/multiplayer`**: cablea `createGameRuntime` + `MultiplayerSession` + adapter
PartyKit + `remotePlayersStore` + `RemotePlayers`, con un **RoomLobby** (crear/unirse por código,
`N/4`, reset, nombre). Entregable: dos pestañas se ven moviéndose en tiempo real.

---

## 📁 Archivos

- **CREAR** `apps/web-demo/app/lib/net/createMultiplayerRuntime.ts`
- **CREAR** `apps/web-demo/app/components/net/RoomLobby.tsx`
- **CREAR** `apps/web-demo/app/multiplayer/page.tsx`

---

## ✅ Success Criteria

- [ ] `/multiplayer` carga el juego (reusa `GameTouchCanvas`) + overlay `RoomLobby`
- [ ] Crear room → muestra código copiable; otra pestaña se une con ese código
- [ ] Los avatares remotos se mueven en tiempo real **solo si comparten escena**
- [ ] `RoomLobby` muestra `N/4` y avisa si faltan jugadores; botón **Reset room**
- [ ] Nombre aleatorio editable (`net:setName` vía `session.updateSelf`)
- [ ] Sin room conectada, `/` (single-player) sigue intacto (no regresión)
- [ ] Eventos world remotos se re-emiten al bus local (base para door/item compartido)

---

## 📝 Step 1 — `app/lib/net/createMultiplayerRuntime.ts`

```ts
import { createGameRuntime, type GameSceneConfig } from "../engine/publicApi";
import {
  createMultiplayerSession, createRemotePlayersStore, createSelfDescriptor,
  getSceneState, type GameEvent, type RemotePlayersStore,
} from "@pointclick-engine/engine-core";
import { createPartyKitAdapter } from "./partyKitAdapter";

export interface MultiplayerRuntime {
  remotePlayers: RemotePlayersStore;
  setName: (name: string) => void;
  dispose: () => void;
}

export function createMultiplayerRuntime(opts: {
  room: string;
  host: string;
  scenes: GameSceneConfig[];
  displayName: string;
  inventoryAdapter?: Parameters<typeof createGameRuntime>[0]["inventoryAdapter"];
  dialogAdapter?: Parameters<typeof createGameRuntime>[0]["dialogAdapter"];
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
    bus: runtime,                       // el handle cumple SessionBus (on/emit)
    room: opts.room,
    self: createSelfDescriptor({
      playerId: (globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}`),
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

  // Limpia jugadores desconectados cada 5s.
  const prune = setInterval(() => remotePlayers.pruneStale(8000), 5000);

  return {
    remotePlayers,
    setName: (name) => session.updateSelf({ displayName: name }),
    dispose: () => { clearInterval(prune); session.dispose(); runtime.dispose(); },
  };
}
```

## 📝 Step 2 — `app/components/net/RoomLobby.tsx`

UI overlay (no R3F). Estados: sin-room → "Crear" / "Unirse"; con-room → código + `N/4` + copiar +
reset + editar nombre.

```tsx
"use client";
import { useState } from "react";

export interface RoomLobbyProps {
  code: string | null;
  remoteCount: number;        // otros jugadores en mi escena
  capacity: number;           // 4
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
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 1000, background: "#0f1220cc",
      color: "#e6e9ff", padding: 12, borderRadius: 8, font: "12px monospace", minWidth: 200 }}>
      {!p.code ? (
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={p.onCreate}>Crear partida</button>
          <input placeholder="código" value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)} />
          <button onClick={() => p.onJoin(joinCode)} disabled={joinCode.length < 6}>Unirse</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div>Room: <b>{p.code}</b>{" "}
            <button onClick={() => navigator.clipboard?.writeText(p.code!)}>copiar</button></div>
          <div>Jugadores: <b>{total}/{p.capacity}</b></div>
          {missing > 0 && <div style={{ color: "#ffd166" }}>Faltan {missing} jugador(es)…</div>}
          <input value={p.displayName} onChange={(e) => p.onRename(e.target.value)} />
          <button onClick={p.onReset}>Reset room (nueva)</button>
        </div>
      )}
    </div>
  );
}
```

## 📝 Step 3 — `app/multiplayer/page.tsx`

```tsx
"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import GameTouchCanvas from "../components/GameTouchCanvas";
import { RemotePlayers } from "@pointclick-engine/engine-renderer-r3f";
import { useSceneStore, generateRandomName } from "@pointclick-engine/engine-core";
import { SCENES } from "../../demo-content/scenes/scenes";
import type { GameSceneConfig } from "../lib/engine/publicApi";
import { createMultiplayerRuntime, type MultiplayerRuntime } from "../lib/net/createMultiplayerRuntime";
import { createRoomSession } from "../lib/net/roomSession";
import { localStorageAdapter } from "../lib/platform-web";
import { RoomLobby } from "../components/net/RoomLobby";

const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

export default function MultiplayerPage() {
  const room = useMemo(() => createRoomSession(localStorageAdapter), []);
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState(() => generateRandomName());
  const mpRef = useRef<MultiplayerRuntime | null>(null);
  const [, force] = useReducer((x) => x + 1, 0);
  const sceneId = useSceneStore((s) => s.sceneId);

  useEffect(() => {
    if (!code) return;
    const mp = createMultiplayerRuntime({
      room: code, host: HOST, displayName: name,
      scenes: Object.values(SCENES) as GameSceneConfig[],
    });
    mpRef.current = mp;
    const unsub = mp.remotePlayers.subscribe(force); // refresca el contador N/4
    return () => { unsub(); mp.dispose(); mpRef.current = null; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const remoteCount = mpRef.current?.remotePlayers.getInScene(sceneId).length ?? 0;

  return (
    <>
      <GameTouchCanvas
        extraCanvasChildren={
          mpRef.current ? <RemotePlayers store={mpRef.current.remotePlayers} currentSceneId={sceneId} /> : null
        }
      />
      <RoomLobby
        code={code} remoteCount={remoteCount} capacity={room.capacity} displayName={name}
        onCreate={() => setCode(room.create())}
        onJoin={(c) => { try { setCode(room.join(c)); } catch { alert("código inválido"); } }}
        onReset={() => setCode(room.reset())}
        onRename={(n) => { setName(n); mpRef.current?.setName(n); }}
      />
    </>
  );
}
```

> **Nota de alcance**: la prioridad del MVP es la **presence** (avatares en tiempo real). El estado
> world compartido (puerta/ítem) llega vía `applyRemoteEvent` → `runtime.emit`; los suscriptores del
> demo reaccionan. El claim de ítems con rollback (tasks 05/09) es la 2ª iteración.

## ✅ Verificación
`npm run party:dev` + `npm run dev`. Dos pestañas en `/multiplayer`: crea room en una, copia el
código, únete en la otra → ves el avatar del otro moverse en la misma escena. `/` sigue intacto.

## 📚 References
- `apps/web-demo/app/page.tsx` (patrón `createGameRuntime` + adapters inventory/dialog)
- `apps/web-demo/app/components/GameTouchCanvas.tsx` (slot `extraCanvasChildren`, task 07)
- tasks 04 (sesión), 07 (RemotePlayers), 08 (PartyKit), 10 (roomSession)
