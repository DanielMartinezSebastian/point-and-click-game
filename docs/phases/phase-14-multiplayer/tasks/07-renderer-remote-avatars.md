# Task 07-renderer-remote-avatars

**Effort**: 1.5 days | **Blocks**: 11 | **Blocked by**: 03,06

---

## 🎯 Objetivo

Dibujar en R3F los avatares de los otros jugadores presentes en la **escena actual**, con
interpolación suave de su posición. Reusa el sprite del personaje actual (un único personaje
hoy; `characterId` ya reservado para el futuro).

---

## ✅ Success Criteria

- [ ] `engine-renderer-r3f/src/net/RemotePlayers.tsx`: renderiza un avatar por cada jugador de `remotePlayersStore.getInScene(currentSceneId)`
- [ ] `useRemotePlayerInterpolation`: suaviza posición entre updates de presence (lerp hacia el último target)
- [ ] El avatar usa el mismo pipeline de sprite/clip que el jugador local; selección por `characterId` (hoy mapea al único personaje)
- [ ] Aparición/desaparición al entrar/salir de escena u on join/leave
- [ ] No usa lógica de juego: solo presenta presence (Regla de Oro en el renderer)
- [ ] Verificación visual con dos pestañas (task 10)

---

## 📝 Instructions

### Step 1: RemotePlayers component
Suscríbete a `remotePlayersStore` y al `sceneId` actual. Renderiza el sprite por jugador.
Reusa los clips de animación según `action` (idle/north/south/west/east) ya presentes en el
renderer (`render/sprite/clips.ts`).

### Step 2: Interpolación
La presence llega throttled (~10–15Hz); interpola en `useFrame` hacia el último target para que
el movimiento se vea fluido a 60fps. Nada de pathfinding para remotos: solo seguir su posición.

### Step 3: character mapping
`characterId → sprite`. Hoy hay uno solo: un mapa con un único entry + default. Deja el hook
listo para añadir personajes sin tocar el resto.

### Step 4: Testing/validation
Build del renderer OK; verificación visual en task 10 (dos pestañas, ver avatar del otro moverse).

---

## 📚 References
- `apps/web-demo/app/lib/engine/render/sprite/clips.ts`, `speakingAnimation.ts`
- `packages/engine-renderer-r3f` (componentes de escena existentes)
- `docs/architecture/06-renderer-implementation-guide.md`
