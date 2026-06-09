# Documentación del Proyecto

Índice maestro. **Punto de entrada para subagentes y humanos.**

---

## 🏛️ Architecture (estable — cambia poco)

Diseño del sistema. Lee antes de tocar arquitectura.

- [`architecture/01-layers.md`](architecture/01-layers.md) — Las 4 capas y su responsabilidad
- [`architecture/02-public-api.md`](architecture/02-public-api.md) — Contrato de `publicApi.ts` (estable v1)
- [`architecture/03-rules-core-vs-render.md`](architecture/03-rules-core-vs-render.md) — Decisión: ¿este código va en core o renderer?
- [`architecture/04-platform-ports.md`](architecture/04-platform-ports.md) — Adapters web (storage, clipboard, timer)
- [`architecture/05-bidirectional-communication.md`](architecture/05-bidirectional-communication.md) — Commands & Events API (web ↔ juego)
- [`architecture/06-renderer-implementation-guide.md`](architecture/06-renderer-implementation-guide.md) — Cómo escribir un renderer alternativo
- [`architecture/09-multiplayer.md`](architecture/09-multiplayer.md) — Multijugador agnóstico (port + partición world/presence/private)

---

## 🔧 Workflow (estable — guías reutilizables)

Cómo trabajar en este repo.

- [`workflow/how-to-create-plan.md`](workflow/how-to-create-plan.md) — Crear un nuevo plan modular
- [`workflow/how-to-track-tasks.md`](workflow/how-to-track-tasks.md) — Marcar checks en tracking
- [`workflow/how-to-spawn-subagent.md`](workflow/how-to-spawn-subagent.md) — Delegar tareas autocontenidas
- [`workflow/pre-commit-checklist.md`](workflow/pre-commit-checklist.md) — Validación antes de commit
- [`workflow/commit-convention.md`](workflow/commit-convention.md) — Formato de commits

---

## 🚀 Phases (activo — fases en curso)

Trabajo actual y futuro. Una fase = un directorio con tareas modulares.

- [`phases/phase-2-core-extraction/`](phases/phase-2-core-extraction/) — ✅ Completed: Extracción de core a `packages/engine-core/`
- [`phases/phase-3-renderer-abstract/`](phases/phase-3-renderer-abstract/) — ✅ Completed: Abstracción del renderer
- [`phases/phase-4-bidirectional-web-game/`](phases/phase-4-bidirectional-web-game/) — ✅ Completed: Comunicación web ↔ juego
- [`phases/phase-5-publish/`](phases/phase-5-publish/) — ✅ Completed: Publicación en npm (v0.1.0 publishable)
- [`phases/phase-6-walls-with-openings/`](phases/phase-6-walls-with-openings/) — ✅ Completed: Walls with openings & pathfinding
- [`phases/phase-7-walls-first-class/`](phases/phase-7-walls-first-class/) — ✅ Completed: Walls as first-class scene elements
- [`phases/phase-8-scene-transitions/`](phases/phase-8-scene-transitions/) — ✅ Completed: Scene transitions (collision + item-drop)
- [`phases/phase-9-placed-items-agnóstic/`](phases/phase-9-placed-items-agnóstic/) — ✅ Phases A-C: Placed items refactoring to core (types, dialog keys, stores)
- [`phases/phase-14-multiplayer/`](phases/phase-14-multiplayer/) — 📋 Planning: Multijugador en tiempo real, agnóstico de transporte

---

## 🧩 Components (demo R3F)

Documentación por componente. **Una página por componente.**

- [`components/README.md`](components/README.md) — Lista de componentes
- [`components/_template.md`](components/_template.md) — Template para nuevos

---

## 🔌 Integraciones

Recetas para enchufar el engine con frameworks externos.

- [`integrations/nextjs-i18n.md`](integrations/nextjs-i18n.md) — 3 patrones de i18n con Next.js (browser auto, native routing, next-intl)

---

## 📋 Decisions (ADRs ligeros)

Decisiones arquitectónicas registradas.

- [`decisions/README.md`](decisions/README.md) — Índice de ADRs
- [`decisions/0001-zustand-for-state.md`](decisions/0001-zustand-for-state.md)
- [`decisions/0002-useframe-for-loop.md`](decisions/0002-useframe-for-loop.md)
- [`decisions/0003-monorepo-with-demo.md`](decisions/0003-monorepo-with-demo.md)
- [`decisions/0004-modular-docs-strategy.md`](decisions/0004-modular-docs-strategy.md)

---

## 📚 Otros

- [`ROADMAP_FRAMEWORK_AGNOSTIC_REFACTORING.md`](ROADMAP_FRAMEWORK_AGNOSTIC_REFACTORING.md) — Plan high-level de 5 fases
- [`LIBRARY_API_CONTRACT_V1.md`](LIBRARY_API_CONTRACT_V1.md) — Contrato v1 de API pública
- [`LIBRARY_CONSUMPTION_GUIDE.md`](LIBRARY_CONSUMPTION_GUIDE.md) — Cómo consumir la librería
- [`_archive/`](_archive/) — Documentos reemplazados (referencia histórica)

---

## Para subagentes

Si vas a ejecutar una tarea específica:

1. Lee **solo** el archivo de la tarea: `docs/phases/<fase>/tasks/NN-*.md`
2. Si necesitas contexto, lee el archivo de arquitectura referenciado en la tarea
3. **No leas todos los docs**: cada tarea es autocontenida

Si vas a crear un nuevo plan:

1. Lee `docs/workflow/how-to-create-plan.md`
2. Sigue el template
