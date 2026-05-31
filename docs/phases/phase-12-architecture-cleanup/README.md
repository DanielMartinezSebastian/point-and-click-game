# Phase 12 — Architecture Cleanup: Core Agnosticism & Library Boundaries

**Status**: Planned | **Owner**: Daniel Martínez Sebastián | **Version target**: v0.2.0
**Planned**: 2026-05-31

---

## 🎯 Why

Una auditoría completa de la base de código identificó **6 violaciones confirmadas** del principio central del proyecto: *Core NUNCA importa browser/React/R3F; la demo es consumidora de la librería, no orquestadora*.

Sin esta fase, la API pública no puede publicarse en npm porque:
1. `publicApi.ts` importa stores internos de la demo (`inventoryStore`, `dialogStore`).
2. `GameViewport` envuelve un componente demo-específico (`GameTouchCanvas`) que arrastra SCENES, stores y contenido de la demo.
3. Hooks del engine (`useTransitionSystem`) importan datos de demo directamente.
4. `engine-core` accede a `window.__gameTrace` (browser API).
5. Código genérico y reutilizable (`useClickToMoveController`, `useKeyboardMovementInput`) está enterrado en la demo en lugar de exportarse desde `engine-renderer-r3f`.

**Principio**: cada fix debe dejar el core y el renderer más portables. La demo pasa a ser un consumidor estándar, no un acoplamiento.

---

## 📋 Violaciones detectadas (auditadas el 2026-05-31)

| # | Severidad | Archivo | Línea | Descripción |
|---|-----------|---------|-------|-------------|
| V1 | 🔴 Alta | `packages/engine-core/src/game/state/sceneStore.ts` | 36–44 | `window.__gameTrace` — browser API en core |
| V2 | 🔴 Alta | `apps/web-demo/app/lib/engine/publicApi.ts` | 35–36 | Imports de `inventoryStore` y `dialogStore` de la demo |
| V3 | 🔴 Alta | `apps/web-demo/app/lib/engine/publicApi.ts` | 34, 541–546 | `GameViewport` envuelve `GameTouchCanvas` demo-específico |
| V4 | 🟠 Media | `apps/web-demo/app/lib/engine/runtime/useTransitionSystem.ts` | 6, 37, 125 | Importa `SCENES` de demo-content directamente |
| V5 | 🟠 Media | `apps/web-demo/app/lib/engine/movement/useClickToMoveController.ts` | 1–169 | Hook genérico atrapado en la demo |
| V6 | 🟠 Media | `apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts` | 1–90 | Adapter genérico atrapado en la demo |
| V7 | 🟡 Baja | `apps/web-demo/app/lib/engine/publicApi.ts` | 69–88 | Tipos `GameItemRule`/`GameItemConfig` sin campos de audio |

---

## 🏗️ Arquitectura objetivo

```
ANTES (actual):
publicApi.ts ──imports──▶ store/inventoryStore (demo)
publicApi.ts ──imports──▶ store/dialogStore (demo)
publicApi.ts ──exports──▶ GameViewport → GameTouchCanvas → SCENES + stores (demo)
useTransitionSystem ──imports──▶ SCENES (demo)
sceneStore (core) ──uses──▶ window.__gameTrace (browser)
useClickToMoveController ──lives in──▶ apps/web-demo/lib/engine/movement/
useKeyboardMovementInput ──lives in──▶ apps/web-demo/lib/engine/movement/

DESPUÉS (objetivo):
publicApi.ts ──imports──▶ engine-core + engine-renderer-r3f ÚNICAMENTE
publicApi.ts ──accepts──▶ { inventoryAdapter, dialogAdapter } vía DI en createGameRuntime
GameViewport ──composes──▶ GameCanvasCore (engine-renderer-r3f) + demo hooks
useTransitionSystem ──receives──▶ getSceneBackground: (sceneId) => string | undefined
sceneStore (core) ──uses──▶ console.info (+ TracePort opcional inyectado)
engine-renderer-r3f ──exports──▶ useClickToMoveController, WebKeyboardInput
```

---

## 📊 Task Breakdown

| Task | Scope | Est. LOC | Sprints |
|------|-------|----------|---------|
| [12.1](tasks/01-remove-window-trace-scenestore.md) | Core: eliminar `window.__gameTrace`, LogPort opcional | +60 / -15 | 1 |
| [12.2](tasks/02-fix-publicapi-type-gaps.md) | publicApi: añadir campos audio a `GameItemRule`, `GameItemConfig`, `GameItemDropOutcome` | +30 | 1 |
| [12.3](tasks/03-decouple-transition-system-from-scenes.md) | Runtime: `useTransitionSystem` acepta `getSceneBackground` callback | +15 / -10 | 2 |
| [12.4](tasks/04-remove-demo-store-imports-from-publicapi.md) | publicApi: DI para `inventoryAdapter` y `dialogAdapter` | +80 / -20 | 2 |
| [12.5](tasks/05-extract-click-to-move-to-renderer.md) | Renderer: mover `useClickToMoveController` a `engine-renderer-r3f` | +0 (move) | 3 |
| [12.6](tasks/06-extract-keyboard-input-to-renderer.md) | Renderer: mover `useKeyboardMovementInput` a `engine-renderer-r3f` adapters | +0 (move) | 3 |
| [12.7](tasks/07-split-gameviewport-gamecanvascore.md) | Renderer: extraer `GameCanvasCore` genérico; demo conserva `GameTouchCanvas` | +120 / -40 | 4 |
| [12.8](tasks/08-tests-consolidation.md) | Tests: LogPort, transition system desacoplado, hooks renderer, publicApi contract | +200 | 5 |

**Total**: ~505 LOC neto | **Est. tiempo**: 5–7 horas

---

## 🧪 Tests gap analysis

Las siguientes funcionalidades carecen de cobertura de test tras las fases 8–11:

| Funcionalidad | Archivo | Test necesario |
|---------------|---------|----------------|
| Fade curtain scene transition | `GameTouchCanvas` / `useTransitionSystem` | Test de callbacks `onBeforeChange` + `onBackgroundReady` |
| `preloadSceneBackground` en transición | `useTransitionSystem` L125 | Test de que se llama con background correcto |
| `useClickToMoveController` stuck detection | `useClickToMoveController` | Tests de waypoint, stuck, arrival |
| `useKeyboardMovementInput` normalization | `useKeyboardMovementInput` | Tests WASD/arrows → vector |
| publicApi DI adapters (tras task 12.4) | `publicApi.ts` | Test contract: `inventory:toggle` → adapter.toggle() |
| LogPort en core (tras task 12.1) | `sceneStore` | Test sin `window` → no lanza |

---

## ✅ Success Criteria

- [ ] 8 tareas completadas y trackeadas en `tracking.md`.
- [ ] `grep -rn "window\.\|document\." packages/engine-core/src/` → vacío (excepto comentarios).
- [ ] `publicApi.ts` no importa nada de `../../store/` ni de `../../components/`.
- [ ] `engine-renderer-r3f` exporta `useClickToMoveController` y `WebKeyboardInput`.
- [ ] `useTransitionSystem` no importa `SCENES` ni ningún módulo de `demo-content`.
- [ ] `GameViewport` en publicApi no importa directamente `GameTouchCanvas`.
- [ ] Todos los tests existentes pasan (`npm run test`).
- [ ] ≥ 20 nuevos tests en `packages/engine-core/__tests__/` y `packages/engine-renderer-r3f/src/__tests__/`.
- [ ] Type-check limpio en ambos packages (`npm run typecheck`).
- [ ] La demo sigue funcionando end-to-end (escenas, transiciones, inventario, audio).

---

## 🔗 Dependency Chain

```
Phase 11 (Audio System) ✅ DONE
        ↓
Phase 12 (Architecture Cleanup) ← THIS PHASE
        ↓
Phase 13 (npm publish ready — v0.2.0)
```

---

## ⚠️ Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| 12.4 (DI en publicApi) puede romper llamadas a `inventory:toggle` / `dialog:trigger` en la demo | Provide default adapters basados en stores actuales; rompe solo si no se pasan adapters |
| 12.7 (split GameViewport) es el cambio más invasivo | Hacerlo en rama aislada; la demo usa `GameTouchCanvas` directamente, `GameViewport` es wrapper delgado |
| Mover hooks (12.5/12.6) puede romper imports en demo | Actualizar todos los imports de la demo tras mover; hay pocos callers |

---

## 📝 Changelog

| Fecha | Acción |
|-------|--------|
| 2026-05-31 | Fase creada tras auditoría completa de arquitectura |
