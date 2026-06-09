# Task 03-player-identity-model

**Effort**: 0.5 day | **Blocks**: 04,07,10 | **Blocked by**: 01

---

## 🎯 Objetivo

Definir el modelo de identidad de jugador con `characterId` reservado desde el día 1 (hoy un
único personaje, mañana varios seleccionables — requisito 4). Y el store agnóstico de jugadores
remotos (presence).

---

## ✅ Success Criteria

- [ ] `src/game/net/playerIdentity.ts`: `PlayerId`, `CharacterId`, `PlayerDescriptor`
- [ ] `PlayerDescriptor = { playerId, displayName, characterId, sceneId, position, action }`
- [ ] `DEFAULT_CHARACTER_ID` constante (el único personaje actual)
- [ ] **Nombre anónimo aleatorio** (decisión 4): `generateRandomName()` (p.ej. "Viajero-A3F") asignado por defecto
- [ ] **Nombre cambiable**: command `net:setName` que actualiza `displayName` y lo difunde como presence (sin cuenta/login por ahora)
- [ ] `src/game/state/remotePlayersStore.ts`: store agnóstico (estilo `placedItemsStore`) con `upsert(descriptor)`, `remove(playerId)`, `getInScene(sceneId)`, `getAll()`, `reset()`
- [ ] Tests del store (upsert/remove/filtrado por escena)
- [ ] Exportados desde `src/index.ts`

---

## 📝 Instructions

### Step 1: Identidad
`PlayerDescriptor` debe ser serializable (entra en `NetEnvelope.payload` como presence).
`characterId: CharacterId` siempre presente; default `DEFAULT_CHARACTER_ID`. No añadir UI de
selección de personaje (out of scope), solo reservar el campo en el protocolo. `displayName`
arranca con `generateRandomName()`; el jugador puede cambiarlo (`net:setName`). Identidad
anónima por sesión — sin login/cuenta (ver decisión 4 del README).

### Step 2: remotePlayersStore
Crea un store **factory** agnóstico (no React, no zustand global) como `createPlacedItemsStore`:
`getInScene(sceneId)` es clave para que el renderer dibuje solo los avatares de la escena actual
(interest management en el borde). Mantén `lastSeenTs` para limpieza de jugadores stale.

### Step 3: Testing
`__tests__/remotePlayersStore.test.ts`: upsert actualiza, remove quita, `getInScene` filtra,
`reset` limpia.

---

## 📚 References
- `packages/engine-core/src/game/state/placedItemsStore.ts` (patrón store factory agnóstico)
- [ADR-0008](../../../decisions/0008-multiplayer-architecture.md) §6
