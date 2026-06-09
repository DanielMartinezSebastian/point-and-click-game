# Task 07-renderer-remote-avatars

**Effort**: 1.5 days | **Blocks**: 11 | **Blocked by**: 03,06

---

## 🎯 Objetivo

Dibujar en R3F los avatares de los otros jugadores presentes en la escena actual, con
interpolación suave. Reusa `DavidSprite` y `GAME_CHARACTER_SPRITES`. Añade un slot en el canvas de
la demo para montarlos.

---

## 📁 Archivos

- **CREAR** `packages/engine-renderer-r3f/src/net/RemotePlayers.tsx`
- **EDITAR** `packages/engine-renderer-r3f/src/index.ts` (export `RemotePlayers`)
- **EDITAR** `apps/web-demo/app/components/GameTouchCanvas.tsx` (prop slot `extraCanvasChildren`)

---

## ✅ Success Criteria

- [ ] `RemotePlayers` renderiza un sprite por jugador de `store.getInScene(currentSceneId)`
- [ ] Posición interpolada (lerp en `useFrame`); animación según `action`
- [ ] `GameTouchCanvas` acepta `extraCanvasChildren?: ReactNode` montado dentro de `<Physics>`
- [ ] Sin lógica de juego (solo presenta presence)
- [ ] `npm run build -w packages/engine-renderer-r3f` compila
- [ ] Verificación visual en task 11 (dos pestañas)

---

## 📝 Step 1 — `engine-renderer-r3f/src/net/RemotePlayers.tsx`

```tsx
"use client";
import { useEffect, useReducer, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Mesh } from "three";
import DavidSprite from "../sprite/DavidSprite";
import { GAME_CHARACTER_SPRITES } from "../sprite/clips";
import type { PlayerDescriptor, RemotePlayersStore } from "@pointclick-engine/engine-core";

/** Suscribe a la store (re-render en cada cambio). */
function useRemotePlayers(store: RemotePlayersStore): PlayerDescriptor[] {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => store.subscribe(() => force()), [store]);
  return store.getAll();
}

function RemotePlayerSprite({ player }: { player: PlayerDescriptor }) {
  const meshRef = useRef<Mesh>(null);
  const target = useRef(new Vector3(player.position[0], player.position[1], player.position[2]));
  const initialized = useRef(false);

  // Actualiza el objetivo cada render (presence llega throttled ~12Hz).
  target.current.set(player.position[0], player.position[1], player.position[2]);

  const sprites = GAME_CHARACTER_SPRITES[player.characterId] ?? GAME_CHARACTER_SPRITES.Dave;
  const animation = sprites[player.action] ?? sprites.idle;

  useFrame((_, dt) => {
    const m = meshRef.current;
    if (!m) return;
    if (!initialized.current) { m.position.copy(target.current); initialized.current = true; return; }
    m.position.lerp(target.current, Math.min(1, dt * 10)); // suavizado a 60fps
  });

  return <DavidSprite animation={animation} meshRef={meshRef} isPaused={player.action === "idle"} />;
}

export interface RemotePlayersProps {
  store: RemotePlayersStore;
  currentSceneId: string;
}

/** Dibuja los avatares de los demás jugadores en la escena actual. */
export function RemotePlayers({ store, currentSceneId }: RemotePlayersProps) {
  const players = useRemotePlayers(store);
  const inScene = players.filter((p) => p.sceneId === currentSceneId);
  return (
    <>
      {inScene.map((p) => <RemotePlayerSprite key={p.playerId} player={p} />)}
    </>
  );
}
```

## 📝 Step 2 — export en `engine-renderer-r3f/src/index.ts`
```ts
// Net
export { RemotePlayers, type RemotePlayersProps } from "./net/RemotePlayers";
```

## 📝 Step 3 — Slot en `GameTouchCanvas.tsx`

1. Añade a `GameTouchCanvasProps`:
```ts
  /** Contenido extra dentro del mundo físico (p.ej. <RemotePlayers/> en /multiplayer). */
  extraCanvasChildren?: React.ReactNode;
```
2. Desestructura `extraCanvasChildren` en los props del componente.
3. Móntalo dentro de `<Physics>`, junto a `<SceneTransitions/>`:
```tsx
        <SceneTransitions debug={runtimeDebug} onTransitionTriggered={handleTransitionTriggered} />
        {extraCanvasChildren}
      </Physics>
```

> Cambio aditivo y backward-compatible: sin la prop, el comportamiento single-player es idéntico.

## ✅ Verificación
`npm run build -w packages/engine-renderer-r3f` compila. Validación visual en task 11.

## 📚 References
- `packages/engine-renderer-r3f/src/sprite/DavidSprite.tsx` (`meshRef`, `animation`, `isPaused`)
- `packages/engine-renderer-r3f/src/sprite/clips.ts` (`GAME_CHARACTER_SPRITES`, direcciones)
- `apps/web-demo/app/components/GameTouchCanvas.tsx` (`<Physics>` envuelve el mundo)
