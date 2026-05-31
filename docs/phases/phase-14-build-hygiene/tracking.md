# Phase 14 — Progress Tracking

**Phase**: 14 — Build Hygiene
**Status**: Planning
**Started**: —
**Completed**: —

---

## Tareas

- [ ] [14.1 — Fix `ignoreDeprecations` inválido en tsconfig raíz](tasks/01-fix-ignoredeprecations.md)
- [ ] [14.2 — Excluir `__tests__` del `dist` + fix errores de tipo pre-existentes](tasks/02-exclude-tests-fix-type-errors.md)

---

## Post-Phase Checklist

- [ ] `npm run build` (raíz) pasa sin `TS5103` ni errores de tipo
- [ ] `npx tsc -p packages/engine-core/tsconfig.json` pasa en verde
- [ ] `dist/` de engine-core y engine-renderer-r3f no contienen `__tests__/` ni `*.test.*`
- [ ] `npm test` pasa (239+ tests)
- [ ] `next build` de `apps/web-demo` sigue pasando
- [ ] Sin cambios de runtime ni de API pública (`publicApi.ts` intacto)
