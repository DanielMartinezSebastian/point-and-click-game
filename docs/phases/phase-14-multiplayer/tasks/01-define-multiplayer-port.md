# Task 01-define-multiplayer-port

**Effort**: 1 day | **Blocks**: 02,04,08,10 | **Blocked by**: —

---

## 🎯 Objetivo

Definir el contrato agnóstico de transporte (`MultiplayerPort`) y el sobre serializable
(`NetEnvelope`) en `engine-core`, más un adapter headless de loopback en memoria para tests.
El core nunca toca WebSocket/proveedor: solo esta interfaz.

---

## ✅ Success Criteria

- [ ] `MultiplayerPort`, `NetEnvelope`, `ConnectionStatus`, `RoomId`, `PlayerId` definidos en `src/ports/multiplayer.ts`
- [ ] `HeadlessMultiplayerAdapter` + `InMemoryHub` en `src/ports/headlessMultiplayer.ts` (conecta N sesiones en proceso)
- [ ] Tests: dos adapters conectados al mismo hub intercambian `NetEnvelope`
- [ ] Exportados desde `src/index.ts`
- [ ] Test de agnosticismo: ningún import de red/`window` en core
- [ ] No breaking changes a la API pública

---

## 📝 Instructions

### Step 1: Port
Crea `src/ports/multiplayer.ts` con la interfaz y tipos descritos en
`docs/architecture/09-multiplayer.md` §3 (`connect`, `disconnect`, `send`, `onMessage`,
`onStatus`). `NetEnvelope` lleva `{ v, room, from, ts, kind, payload }`. Sigue el estilo de
`src/ports/i18n.ts` y `audio.ts` (interface + JSDoc, cero dependencias).

### Step 2: Headless adapter + hub
`HeadlessMultiplayerAdapter` implementa el port contra un `InMemoryHub` compartido que reenvía
cada `send` a los demás adapters suscritos (broadcast loopback, sin self-echo salvo opción).
Esto permite simular varios clientes en un test sin red.

### Step 3: Testing
`__tests__/multiplayerPort.test.ts`: dos adapters + un hub; `send` desde A llega a `onMessage`
de B; `onStatus` reporta `connected`/`disconnected`; `disconnect` deja de recibir.

### Step 4: Validation
`npm test` verde; revisar que no se importa nada de `apps/` ni red en core.

---

## 📚 References
- `docs/architecture/09-multiplayer.md` §3
- `packages/engine-core/src/ports/i18n.ts`, `headlessI18n.ts` (patrón de port + headless)
