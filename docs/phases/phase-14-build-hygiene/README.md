# Phase 14: Build Hygiene

**Objetivo**: Sanear la toolchain de build de los packages para que `npm run build` y el type-check pasen limpios en cualquier entorno (local + CI/Vercel).
**Duración estimada**: ~1 día (2 tareas pequeñas, delegables)
**Estado**: planning
**Owner**: Daniel Martínez Sebastián

## Por qué

Durante el fix del build de Vercel (Phase 13, i18n) se detectaron dos
problemas latentes en la toolchain que NO bloqueaban Vercel pero sí rompen
`npm run build` localmente y ensucian el `dist` publicado:

1. **`tsconfig.json` raíz** tiene `"ignoreDeprecations": "6.0"`, valor inválido
   para TypeScript 5.9 → `error TS5103: Invalid value for '--ignoreDeprecations'`.
   Cualquier `tsc` que extienda el config raíz falla con un error de
   configuración antes de compilar nada.
2. **`engine-core` compila los `__tests__` dentro de `dist/`** (el tsconfig de
   build no los excluye), y esos tests arrastran errores de tipo
   pre-existentes de Phase 11 (`audioRules.test.ts`). Resultado: el `dist`
   publicado incluye tests, y `tsc` reporta errores de tipo en cada build.

Ambos son deuda técnica de toolchain: independientes de runtime, pero
conviene cerrarlos para que el build sea verde y el paquete publicado limpio.

## Resultado esperado

- `npm run build` (raíz, `--workspaces`) pasa sin errores de config ni de tipo.
- `dist/` de los packages NO contiene `__tests__/` ni `*.test.*`.
- `npm test` y el type-check de `engine-core` pasan en verde.
- Sin cambios de runtime ni de API pública.

## Tareas

- [ ] [01-fix-ignoredeprecations.md](tasks/01-fix-ignoredeprecations.md)
- [ ] [02-exclude-tests-fix-type-errors.md](tasks/02-exclude-tests-fix-type-errors.md)

## Notas para quien ejecute

Cada task file es autocontenido (incluye errores exactos, rutas y pasos de
validación) y puede delegarse a un subagente o modelo distinto sin leer otros
docs. Ver `docs/workflow/how-to-spawn-subagent.md`.
