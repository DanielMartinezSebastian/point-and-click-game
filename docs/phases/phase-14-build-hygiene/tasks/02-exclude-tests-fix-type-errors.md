# Task 02 — Excluir `__tests__` del `dist` + fix errores de tipo pre-existentes

**Effort**: ~1.5h | **Blocks**: ninguna | **Blocked by**: 01 (recomendado)

---

## 🎯 Objetivo

`engine-core` compila los `__tests__` dentro de `dist/` (el tsconfig de build
no los excluye) y esos tests arrastran errores de tipo pre-existentes de
Phase 11 en `audioRules.test.ts`. Hay que (a) sacar los tests del `dist`
publicado y (b) corregir los errores de tipo para que el type-check pase.

---

## ✅ Success Criteria

- [ ] `dist/` de engine-core y engine-renderer-r3f NO contienen `__tests__/` ni `*.test.*`
- [ ] `npx tsc -p packages/engine-core/tsconfig.json` pasa SIN errores de tipo
- [ ] `npm test` sigue pasando (239+ tests)
- [ ] `next build` de `apps/web-demo` sigue pasando
- [ ] Sin cambios de runtime ni de API pública

---

## 📝 Instructions

### Step 1 — Excluir tests del build

En `packages/engine-core/tsconfig.json` (y `packages/engine-renderer-r3f/tsconfig.json`),
añadir los tests al `exclude`:

```jsonc
"exclude": [
  "node_modules",
  "dist",
  "**/__tests__/**",
  "**/*.test.ts",
  "**/*.test.tsx"
]
```

Los tests se seguirán ejecutando con Vitest (que usa su propia resolución),
pero ya no se emitirán a `dist`.

### Step 2 — Borrar los tests ya commiteados en `dist`

```bash
git rm -r packages/engine-core/dist/__tests__
git rm -r packages/engine-renderer-r3f/dist/__tests__
```

(Si tras rebuild reaparecen, revisar que el `exclude` del Step 1 aplica.)

### Step 3 — Fix errores de tipo pre-existentes en `audioRules.test.ts`

`packages/engine-core/src/__tests__/audioRules.test.ts` tiene 3 errores:

1. **Línea 8** — `GameEvent` se importa de `../game/types` pero NO se exporta
   ahí; vive en `../game/events`. Separar el import:
   ```ts
   import type { GameScene, ItemDefinition } from "../game/types";
   import type { GameEvent } from "../game/events";
   ```

2. **Líneas ~185 y ~210** — Los objetos `GameSceneTransition` se crean sin el
   discriminante `kind` (la unión ahora exige `kind`). Añadir el `kind`
   correcto. Para un trigger por colisión simple:
   ```ts
   { kind: "collision", id: "...", targetSceneId: "...", position: [...], halfSize: [...], triggerSoundUrl: "..." }
   ```
   Consultar la definición de `GameSceneTransition` en
   `packages/engine-core/src/game/types/index.ts` (variantes: `collision`,
   `item-drop`, `item-consume`, `item-interaction`, `drop-target`) y elegir la
   que corresponda a lo que el test pretende validar. Si la variante exige
   `requiresItemId`, añadirlo.

### Step 4 — Validación

```bash
npx tsc -p packages/engine-core/tsconfig.json   # 0 errores
npm test                                         # verde
npm run build -w apps/web-demo                   # next build verde
ls packages/engine-core/dist/__tests__ 2>/dev/null  # no debe existir
```

---

## 📚 References

- `packages/engine-core/tsconfig.json` — `exclude`
- `packages/engine-core/src/__tests__/audioRules.test.ts` — errores TS2305 / TS2322
- `packages/engine-core/src/game/events/types.ts` — `GameEvent`
- `packages/engine-core/src/game/types/index.ts` — `GameSceneTransition` (campo `kind`)
- Origen de los errores: commit `b3de20b` (Phase 11 audio tests)
