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

## Escenarios manuales (pendientes de run con servidor)

Requieren `npm run party:dev` + `npm run dev` y dos pestañas en `/multiplayer`:

| # | Escenario | Estado |
|---|-----------|--------|
| A | Presence por escena (avatares en misma escena) | ⏳ manual — lógica cubierta por `multiplayerSession.test.ts` |
| E | Room lifecycle (código/join/solo/`N/4`/reset/cap 4) | ⏳ manual — lógica cubierta por `roomSession.test.ts` (cap 4 server-side en `party/multiplayer.ts`) |
| B/C/D | Puerta/llave/claim world compartido | ⏳ 2ª iteración (item-sync completo) |

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
