# Task 08-transport-adapters-and-vercel

**Effort**: 2 days | **Blocks**: 10,11 | **Blocked by**: 01

---

## 🎯 Objetivo

Implementar el adapter real del `MultiplayerPort` sobre **PartyKit** (elección confirmada,
decisión 1 — server-authoritative) fuera del core, y documentar el despliegue en Vercel/serverless
(requisito 3).

---

## ✅ Success Criteria

- [ ] Adapter **PartyKit** (elección por defecto) implementa `MultiplayerPort`: room = partida (por código), fan-out, snapshot al unirse, autoridad server-side
- [ ] Capacidad de room aplicada en el server (límite 4, ver task 10): 5º join → status `room-full`
- [ ] Liveblocks / WS microservicio quedan documentados como alternativas detrás del mismo port (sin implementar)
- [ ] Guía de despliegue: por qué la conexión persistente NO vive en funciones Vercel y dónde sí
- [ ] El adapter vive fuera de `engine-core` (no rompe agnosticismo); se inyecta en `createMultiplayerRuntime`
- [ ] Smoke test: dos clientes reales intercambian presence + un evento world a través del adapter

---

## 📝 Instructions

### Step 1: PartyKit adapter
Servidor PartyKit (Durable Object) que mantiene el estado del room y hace fan-out. El cliente
implementa `MultiplayerPort` sobre su socket. Room sharding por partida; presence shardeada por
escena dentro del room. Maneja `connect/disconnect/send/onMessage/onStatus`.

### Step 2: Segundo proveedor (doc + stub)
Documenta cómo se vería con Liveblocks (presence nativa + storage LWW para world) o un WS
microservicio propio (Fly.io/Railway). No hace falta implementarlo completo: stub + notas.

### Step 3: Vercel doc
En este task file + enlace desde `docs/architecture/09-multiplayer.md` §6: Next.js en Vercel OK,
pero el realtime corre en PartyKit/Liveblocks/microservicio. Variables de entorno, CORS, y por
qué los serverless functions no sirven para conexiones persistentes.

### Step 4: Smoke test
Dos pestañas contra el adapter (PartyKit dev server local): se ven y comparten un evento world.

---

## 📚 References
- `docs/architecture/09-multiplayer.md` §6 (tabla de proveedores + Vercel)
- `packages/engine-core/src/ports/multiplayer.ts` (contrato a implementar, task 01)
- [ADR-0008](../../../decisions/0008-multiplayer-architecture.md) §1, §4
