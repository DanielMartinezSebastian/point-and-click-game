# Architecture Decision Records (ADRs)

Decisiones arquitectónicas registradas con contexto, decisión, y consecuencias.

## Por qué ADRs

Cuando alguien (humano o subagente) se pregunta "¿por qué se eligió X en lugar de Y?", la respuesta vive aquí. Evita re-debatir decisiones ya tomadas.

## Formato

Cada ADR es **~30 líneas**. Estructura:

```markdown
# NNNN-<slug>

**Status**: accepted | superseded by NNNN | deprecated
**Date**: YYYY-MM-DD

## Context
<3-5 líneas: el problema>

## Decision
<1-2 líneas: qué decidimos>

## Consequences
- ✅ Pro 1
- ✅ Pro 2
- ❌ Con 1

## Alternatives considered
- Alt A: por qué no
- Alt B: por qué no
```

## ADRs actuales

- [0001 — Zustand for state management](0001-zustand-for-state.md)
- [0002 — useFrame from R3F for game loop](0002-useframe-for-loop.md)
- [0003 — Monorepo with demo inside](0003-monorepo-with-demo.md)
- [0004 — Modular docs strategy (subagent-first)](0004-modular-docs-strategy.md)
- [0005 — Renderer ports design (GameLoopPort, InputPort, ViewportPort)](0005-renderer-ports-design.md)
- [0006 — Command/Event architecture (bidirectional web ↔ game)](0006-command-event-architecture.md)
- [0007 — Release strategy (npm scope, versioning, publish process)](0007-release-strategy.md)
- [0008 — Multiplayer architecture (agnostic transport + state partition)](0008-multiplayer-architecture.md)

## Cómo añadir un ADR

1. Próximo número libre (e.g., `0005`)
2. Slug descriptivo en kebab-case
3. Crear `NNNN-slug.md` desde el formato arriba
4. Añadir entrada en este README
5. Commit: `docs(adr): NNNN <título>`

## Cuándo NO crear ADR

- Para detalles de implementación (van en código o componentes/)
- Para decisiones triviales (qué nombre de variable)
- Para tareas (van en phases/*/tasks/)
