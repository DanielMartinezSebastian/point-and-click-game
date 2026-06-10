# Phase 14 — Validation Report (MVP implementation)

**Fecha**: 2026-06-10 | **Rama**: `claude/phase-14-multiplayer-impl`

## Alcance implementado

MVP de presencia en tiempo real + rooms por código, end-to-end. Tasks 01–11 implementadas;
task 12 (gate) parcialmente: gate automático ✅, escenarios E2E de dos pestañas pendientes de run
manual (requieren `partykit dev` + navegador, no verificable headless).

## Gate automático

| Check | Resultado |
|-------|-----------|
| `npm test -w packages/engine-core` | ✅ **273 passed** (37 files) — +29 tests nuevos sobre baseline 244 |
| `npm test -w apps/web-demo` (roomSession) | ✅ **6/6** roomSession |
| Test de agnosticismo del core (`netAgnosticism.test.ts`) | ✅ verde (game/net + ports/multiplayer sin red/`window`/`localStorage`) |
| `npm run build -w packages/engine-core` (tsc) | ✅ |
| `npm run build -w packages/engine-renderer-r3f` (tsc) | ✅ |
| `tsc --noEmit` app — **archivos nuevos** | ✅ **0 errores** en `lib/net/`, `multiplayer/`, `party/`, `components/net/`, `RemotePlayers` |
| No regresión single-player | ✅ los únicos fallos (4 en `publicApi.test.ts`, 10 errores tsc en 2 test files) **pre-existen en main** (verificado por stash) |

### Tests nuevos del core (29)
`multiplayerPort` (4), `eventClassification` (5), `remotePlayersStore` (4), `worldStateLww` (3),
`itemClaim` (3), `presence`/throttle (1), `optimisticReconcile` (3), `multiplayerSession` (5 —
replica world, bloquea private, anti-eco, presence join, propaga posición), `netAgnosticism` (1).

## Verificación en vivo (2026-06-10)

Servidores levantados: PartyKit (`:1999`) + Next.js (`:3000`).

| # | Escenario | Estado |
|---|-----------|--------|
| — | Ruta `/multiplayer` renderiza (juego + RoomLobby) | ✅ verificado (screenshot) |
| — | Crear room → WebSocket a PartyKit | ✅ `GET /parties/multiplayer/FK4CFY 101 Switching Protocols` |
| E | Room lifecycle: código `FK4CFY`, `Jugadores 1/4`, "Faltan 3", nombre `Vecino-B9F`, reset | ✅ verificado (lobby) |
| A | Presence por escena (2 avatares moviéndose) | ⏳ requiere 2ª pestaña interactiva — lógica cubierta por `multiplayerSession.test.ts` |
| B/C/D | Puerta/llave/claim world compartido | ⏳ 2ª iteración (item-sync completo) |

### Prod build (Vercel-ready)

- `next build` → **EXIT 0**; `/multiplayer` listada como ruta estática prerenderizada.
- TypeScript de build OK (los 10 errores tsc pre-existentes están en test files, no bloquean el build).
- Despliegue documentado en `DEPLOY.md` (PartyKit deploy + `NEXT_PUBLIC_PARTYKIT_HOST` en Vercel).

### Issue dev no bloqueante

- Hydration mismatch en `InventoryUI` (`aria-label` i18n: clave cruda en SSR vs traducida en cliente).
  **Pre-existente** (también en `/`), no relacionado con multijugador. Solo warning de dev.

## Notas de implementación (desviaciones del plan)

- `InMemoryHub.register(id, room, inbound)` lleva la room del peer y `broadcast` filtra por
  `message.room` (aísla rooms correctamente). El doc de task 01 se actualizó para reflejarlo.
- Deps añadidas a `apps/web-demo`: `partysocket` (cliente) y `partykit` (servidor/CLI).
- E2E real (dos navegadores) no es verificable en entorno headless; queda documentado el comando.

## Cómo probar en local

```bash
# Terminal 1: servidor PartyKit
npm run party:dev -w apps/web-demo
# Terminal 2: Next
npm run dev -w apps/web-demo
# Abre http://localhost:3000/multiplayer en dos pestañas → Crear / Unirse con el código
```
