# Task 06-presence-and-interest-management

**Effort**: 1.5 days | **Blocks**: 07,11 | **Blocked by**: 04

---

## 🎯 Objetivo

Sincronizar presence (posición, escena, acción, characterId) de forma eficiente: shardeada por
escena y throttled, para minimizar latencia y ancho de banda (requisito 3). Solo se hace fan-out
a jugadores en la misma escena.

---

## ✅ Success Criteria

- [ ] Presence se envía como `kind: "presence"` con `PlayerDescriptor` parcial (delta)
- [ ] **Sharding por escena**: el envelope incluye `sceneId`; el consumidor (y/o servidor) solo aplica/reenvía presence de la escena propia
- [ ] **Throttle** de `player:moved`: configurable (~10–15 Hz), aplicado en la **frontera** (renderer/session config), nunca en el motor
- [ ] Snapshot al unirse: al conectar, se recibe el world completo + presence de la escena actual (`kind: "snapshot"`)
- [ ] Limpieza de jugadores stale (sin presence en N segundos → `remove`)
- [ ] Tests: presence de escena B no se aplica si estoy en escena A; throttle reduce nº de envíos

---

## 📝 Instructions

### Step 1: Presence pipeline
`MultiplayerSession` mapea `scene:changed`/`player:moved` → presence delta. Marca `sceneId`.
Al recibir presence remoto, `remotePlayersStore.upsert` solo si interesa (misma escena) o lo
guarda con su `sceneId` y deja que el renderer filtre con `getInScene`.

### Step 2: Throttle + interpolación
El throttle de envío vive en la config de la session (rate). La interpolación de posición
recibida vive en el renderer (task 07). El motor sigue a 60Hz internamente.

### Step 3: Snapshot/reconexión
Al unirse o reconectar: pedir snapshot del world (LWW map) + presence de la escena. Reconciliar
con estado optimista local (coordinar con task 09).

### Step 4: Testing
`__tests__/presence.test.ts`: dos sesiones en escenas distintas no se ven; al cambiar a la misma
escena, aparecen; throttle limita la frecuencia de `send`.

---

## 📚 References
- `docs/architecture/09-multiplayer.md` §5
- `packages/engine-core/src/game/state/remotePlayersStore.ts` (task 03)
- Nota throttle en `docs/architecture/05-bidirectional-communication.md` (player:moved a ~60Hz)
