# Phase 12 — Progress Tracking

**Phase**: 12 — Architecture Cleanup: Core Agnosticism & Library Boundaries
**Status**: Planned
**Started**: —
**Completed**: —

---

## Sprint 1 — Core agnosticism (sin riesgo de romper demo)

- [x] [12.1 — Core: eliminar window.__gameTrace, LogPort opcional](tasks/01-remove-window-trace-scenestore.md)
- [x] [12.2 — publicApi: completar tipos audio (GameItemRule, GameItemConfig, GameItemDropOutcome)](tasks/02-fix-publicapi-type-gaps.md)

## Sprint 2 — Desacoplar demo de hooks del engine

- [x] [12.3 — useTransitionSystem: eliminar import SCENES, aceptar resolveScene callback](tasks/03-decouple-transition-system-from-scenes.md)
- [x] [12.4 — publicApi: eliminar imports de demo stores, DI para inventory + dialog](tasks/04-remove-demo-store-imports-from-publicapi.md)

## Sprint 3 — Extraer hooks genéricos al renderer

- [x] [12.5 — engine-renderer-r3f: mover useClickToMoveController](tasks/05-extract-click-to-move-to-renderer.md)
- [x] [12.6 — engine-renderer-r3f: mover useKeyboardMovementInput](tasks/06-extract-keyboard-input-to-renderer.md)

## Sprint 4 — Separar GameViewport de GameTouchCanvas

- [x] [12.7 — engine-renderer-r3f: extraer GameCanvasCore; publicApi no importa demo](tasks/07-split-gameviewport-gamecanvascore.md)

## Sprint 5 — Tests de consolidación

- [x] [12.8 — Tests: LogPort, transitionSystem, hooks renderer, publicApi DI contract](tasks/08-tests-consolidation.md)

---

## Post-Phase Checklist

- [ ] Todos los tests pasan (`npm run test` en root)
- [ ] Type-check limpio en `packages/engine-core` y `packages/engine-renderer-r3f`
- [ ] `grep -rn "window\.\|document\." packages/engine-core/src/` → vacío
- [ ] `publicApi.ts` sin imports de `../../store/` ni `../../components/`
- [ ] `useTransitionSystem` sin import de `demo-content`
- [ ] `engine-renderer-r3f` exporta `useClickToMoveController` y `WebKeyboardInput`
- [ ] Demo funciona end-to-end (manual smoke test)
- [ ] ≥ 20 tests nuevos añadidos

---

## Deliverables esperados

### Core (engine-core) — ~75 LOC neto
- `logSceneStore` depende de `console.info` únicamente; sin `window`
- Tipos `GameItemRule`, `GameItemConfig`, `GameItemDropOutcome` completos en publicApi

### Runtime hooks (web-demo/lib/engine) — ~95 LOC neto
- `useTransitionSystem` sin import de SCENES
- `publicApi.ts` acepta `{ inventoryAdapter, dialogAdapter }` en lugar de importar stores

### Renderer (engine-renderer-r3f) — ~260 LOC (moves + new exports)
- `useClickToMoveController` exportado desde el package
- `WebKeyboardInput` / `useKeyboardMovementInput` exportado desde el package
- `GameCanvasCore` como componente R3F genérico (sin demo content)

### Tests — ~200 LOC
- `packages/engine-core/__tests__/sceneStoreAgnosticism.test.ts`
- `packages/engine-renderer-r3f/src/__tests__/useClickToMoveController.test.ts`
- `packages/engine-renderer-r3f/src/__tests__/useKeyboardMovementInput.test.ts`
- `apps/web-demo/app/lib/engine/publicApi.di.test.ts`

---

## Timeline

| Fecha | Task | Status |
|-------|------|--------|
| 2026-05-31 | Plan creado | ⏳ |
