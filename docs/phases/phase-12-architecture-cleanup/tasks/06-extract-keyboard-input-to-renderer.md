# Task 12.6 — engine-renderer-r3f: mover useKeyboardMovementInput

**Effort**: 30 min | **Blocks**: [12.8] | **Blocked by**: [12.5] (opcional, pueden hacerse en orden)
**Scope**: `apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts` → `packages/engine-renderer-r3f/src/adapters/`

---

## 🎯 Objetivo

`useKeyboardMovementInput` normaliza WASD/arrow key input hacia un vector de movimiento normalizado.
Solo depende de React y el `browserEnvironmentAdapter` de la demo (para gestión de event listeners).

Es código de librería (cualquier juego R3F con teclado lo necesitaría) pero vive en la demo.
La fix: moverlo a `packages/engine-renderer-r3f/src/adapters/` junto a los otros adapters de input.

> **Nota**: el hook actualmente usa `browserEnvironmentAdapter` de la demo.
> Durante el move, conectarlo al `InputPort` del core o al adapter de teclado existente
> `packages/engine-renderer-r3f/src/adapters/keyboardInput.ts`.

---

## ✅ Success Criteria

- [ ] Archivo movido a `packages/engine-renderer-r3f/src/adapters/useKeyboardMovementInput.ts`.
- [ ] Exportado desde `packages/engine-renderer-r3f/src/index.ts` como `useKeyboardMovementInput`.
- [ ] Sin dependencia de `browserEnvironmentAdapter` de la demo; usa el adapter del renderer.
- [ ] Import actualizado en la demo.
- [ ] `apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts` eliminado.
- [ ] `tsc` pasa en ambos packages.

---

## 📝 Instructions

### Step 1 — Revisar qué usa de browserEnvironmentAdapter

```bash
grep -n "browserEnvironmentAdapter" apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts
```

El adapter de browser probablemente se usa para `addEventListener`/`removeEventListener`.
Reemplazarlo con llamadas directas a `window.addEventListener` (válido en el renderer web)
o conectarlo al `keyboardInput.ts` existente en `engine-renderer-r3f/src/adapters/`.

### Step 2 — Copiar y adaptar

```bash
cp apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts \
   packages/engine-renderer-r3f/src/adapters/useKeyboardMovementInput.ts
```

Reemplazar cualquier import de `browserEnvironmentAdapter`:

```typescript
// Si usaba browserEnvironmentAdapter solo para addEventListener:
// Reemplazar directamente con useEffect + addEventListener standard
// (es código de renderer web — window está disponible aquí)
```

### Step 3 — Exportar desde engine-renderer-r3f

En `packages/engine-renderer-r3f/src/index.ts`, añadir:

```typescript
export { useKeyboardMovementInput } from "./adapters/useKeyboardMovementInput";
```

### Step 4 — Actualizar imports en la demo

```bash
grep -rn "useKeyboardMovementInput" apps/web-demo/ --include="*.ts" --include="*.tsx"
```

Para cada caller:

```typescript
// ANTES:
import { useKeyboardMovementInput } from "../movement/useKeyboardMovementInput";

// DESPUÉS:
import { useKeyboardMovementInput } from "@pointclick-engine/engine-renderer-r3f";
```

### Step 5 — Cleanup

```bash
rm apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts
# Si movement/ queda vacío:
rmdir apps/web-demo/app/lib/engine/movement/ 2>/dev/null || true
```

### Step 6 — Validación

```bash
cd packages/engine-renderer-r3f && npm run build
cd apps/web-demo && npm run typecheck
```

---

## 📚 References

- `apps/web-demo/app/lib/engine/movement/useKeyboardMovementInput.ts` — fuente
- `packages/engine-renderer-r3f/src/adapters/keyboardInput.ts` — adapter de teclado existente
- Violación V6 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
