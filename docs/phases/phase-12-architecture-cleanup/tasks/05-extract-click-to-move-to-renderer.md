# Task 12.5 — engine-renderer-r3f: mover useClickToMoveController

**Effort**: 45 min | **Blocks**: [12.8] | **Blocked by**: ninguna
**Scope**: `apps/web-demo/app/lib/engine/movement/useClickToMoveController.ts` → `packages/engine-renderer-r3f/src/hooks/`

---

## 🎯 Objetivo

`useClickToMoveController` es un hook completamente genérico (importa solo `react` y `three`,
más el tipo `MovementPoint` del core) que implementa waypoint tracking, stuck detection
y arrival threshold para navegación click-to-move.

Cualquier juego point-and-click construido con R3F + engine-core necesita esto.
Actualmente está enterrado en la demo — no es descubrible ni reutilizable.

La fix: moverlo a `packages/engine-renderer-r3f/src/hooks/` y exportarlo desde el package.

---

## ✅ Success Criteria

- [ ] Archivo movido a `packages/engine-renderer-r3f/src/hooks/useClickToMoveController.ts`.
- [ ] Exportado desde `packages/engine-renderer-r3f/src/index.ts`.
- [ ] Import actualizado en la demo (usa `@pointclick-engine/engine-renderer-r3f`).
- [ ] `apps/web-demo/app/lib/engine/movement/useClickToMoveController.ts` eliminado.
- [ ] Tests existentes pasan; nuevo test añadido en task 12.8.
- [ ] `tsc` pasa en ambos packages.

---

## 📝 Instructions

### Step 1 — Copiar el archivo al renderer

```bash
cp apps/web-demo/app/lib/engine/movement/useClickToMoveController.ts \
   packages/engine-renderer-r3f/src/hooks/useClickToMoveController.ts
```

### Step 2 — Revisar imports en el archivo copiado

El import de `MovementPoint` probablemente sea relativo. Actualizarlo:

```typescript
// ANTES (ruta relativa a apps/web-demo):
import type { MovementPoint } from "@pointclick-engine/engine-core";
// (ya usa el package name — verificar que sea así; si es relativo, convertirlo)
```

### Step 3 — Exportar desde engine-renderer-r3f

En `packages/engine-renderer-r3f/src/index.ts`, añadir:

```typescript
export { useClickToMoveController } from "./hooks/useClickToMoveController";
export type { ClickToMoveController } from "./hooks/useClickToMoveController";
// Exportar el tipo del return si existe; si no, inferirlo
```

### Step 4 — Actualizar imports en la demo

Buscar todos los usos en la demo:

```bash
grep -rn "useClickToMoveController" apps/web-demo/ --include="*.ts" --include="*.tsx"
```

Para cada caller, cambiar el import:

```typescript
// ANTES:
import { useClickToMoveController } from "../movement/useClickToMoveController";
// o similar ruta relativa

// DESPUÉS:
import { useClickToMoveController } from "@pointclick-engine/engine-renderer-r3f";
```

### Step 5 — Eliminar el archivo original

```bash
rm apps/web-demo/app/lib/engine/movement/useClickToMoveController.ts
```

Si el directorio `movement/` queda vacío (verificar si `useKeyboardMovementInput` sigue ahí
hasta completar task 12.6), dejarlo hasta que 12.6 termine.

### Step 6 — Build y validación

```bash
cd packages/engine-renderer-r3f && npm run build
cd apps/web-demo && npm run typecheck
```

---

## 📚 References

- `apps/web-demo/app/lib/engine/movement/useClickToMoveController.ts` — archivo fuente
- `packages/engine-renderer-r3f/src/index.ts` — punto de exportación
- Violación V5 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
