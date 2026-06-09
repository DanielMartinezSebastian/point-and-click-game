# Task 04-replication-engine

**Effort**: 2 days | **Blocks**: 05,06,10 | **Blocked by**: 01,02,03

---

## 🎯 Objetivo

Implementar `MultiplayerSession`: la capa de core que puentea `EventBus`/`CommandHandler` con el
`MultiplayerPort`. Convierte eventos locales en mensajes de red (solo world/presence) y aplica
mensajes remotos como mutaciones marcadas `remote` para evitar bucles.

---

## ✅ Success Criteria

- [ ] `src/game/net/MultiplayerSession.ts`: `createMultiplayerSession({ port, bus, commands, classify, remotePlayers, self })`
- [ ] **Salida**: suscribe a `bus`, filtra con `shouldReplicate`, envuelve en `NetEnvelope`, `port.send`
- [ ] **Entrada**: `port.onMessage` → aplica eventos world al store / actualiza presence en `remotePlayersStore` / **no re-emite a la red** (origin tagging)
- [ ] **Prevención de bucles**: los eventos aplicados desde remoto se marcan y no se reenvían
- [ ] `join`/`leave` de jugadores actualiza `remotePlayersStore` y emite `net:playerJoined`/`net:playerLeft` en el bus local
- [ ] `dispose()` limpia suscripciones y desconecta el port
- [ ] Tests con dos sesiones + `InMemoryHub`: evento world en A llega y se aplica en B; un `private` NO viaja
- [ ] Sin `MultiplayerSession`, el motor funciona igual (no regresión)

---

## 📝 Instructions

### Step 1: Eventos/commands de red
En `events/types.ts` añade `net:playerJoined`, `net:playerLeft`, `net:status`. En
`commands/types.ts` añade `net:join`, `net:leave`. Clasifícalos en el registry (task 02).

### Step 2: Origin tagging
El reto central: cuando aplicas un evento recibido de la red, no debe volver a enviarse. Opciones:
flag `__origin: "remote"` en el contexto de aplicación, o aplicar mutaciones vía un canal que no
pasa por el `bus` re-publicado. Documenta la elegida; cubre con test de "no eco".

### Step 3: Serialización
Reusa `GameEvent`/`GameCommand` como `payload`. Presence usa `PlayerDescriptor`. Adjunta `ts`
(HLC, task 05 lo refina; de momento `Date.now()` monótono).

### Step 4: Testing
`__tests__/multiplayerSession.test.ts`: A emite `item:dropped(place)` → B lo aplica a
`placedItems`. A emite `dialog:triggered` → B NO lo recibe. A se conecta → B ve `net:playerJoined`.

---

## 📚 References
- `apps/web-demo/app/lib/engine/publicApi.ts` (cómo se cablea hoy bus + commands en el runtime)
- `packages/engine-core/src/events/EventBus.ts`, `game/commands/CommandHandler.ts`
- `docs/architecture/09-multiplayer.md` §1–§3
