# Task 12.3 — useTransitionSystem: eliminar import de SCENES

**Effort**: 45 min | **Blocks**: [12.8] | **Blocked by**: ninguna
**Scope**: `apps/web-demo/app/lib/engine/runtime/useTransitionSystem.ts`

---

## 🎯 Objetivo

`useTransitionSystem` importa `SCENES` directamente desde `demo-content/scenes/scenes` (línea 6)
para precargar el fondo de la escena destino antes del cambio. Esto acopla un hook del engine
a los datos concretos de la demo — ningún consumidor externo tiene ese `SCENES`.

La fix: reemplazar el import hardcoded por un callback `getSceneBackground` inyectado como opción.
El hook no sabe nada de cómo está organizado el contenido; la demo aporta la función.

---

## ✅ Success Criteria

- [ ] `grep -n "demo-content" apps/web-demo/app/lib/engine/runtime/useTransitionSystem.ts` → vacío.
- [ ] El hook acepta `opts.getSceneBackground?: (sceneId: string) => string | undefined`.
- [ ] La demo pasa `(id) => SCENES[id]?.background` en `GameTouchCanvas`.
- [ ] La funcionalidad de precarga sigue funcionando (el fondo se precarga antes del fade).
- [ ] `tsc` pasa.

---

## 📝 Instructions

### Step 1 — Editar `useTransitionSystem.ts`

```typescript
// ANTES (línea 6):
import { SCENES } from "../../../../demo-content/scenes/scenes";

// DESPUÉS: eliminar ese import y actualizar la firma de opts:

export interface UseTransitionSystemOpts {
  onBeforeChange?: () => void;
  /** Resuelve la URL del fondo de una escena por ID. Usado para precarga. */
  getSceneBackground?: (sceneId: string) => string | undefined;
}

export function useTransitionSystem(opts?: UseTransitionSystemOpts) {
  // ...
}
```

### Step 2 — Reemplazar referencias a SCENES dentro del hook

Buscar en `useTransitionSystem.ts` los usos de `SCENES`:

```typescript
// ANTES (línea ~37):
const scene = SCENES[targetSceneId];

// DESPUÉS: eliminar esta línea (si solo se usaba para el background)

// ANTES (línea ~125):
const targetBg = SCENES[targetSceneId]?.background;
if (targetBg) preloadSceneBackground(targetBg);

// DESPUÉS:
const targetBg = optsRef.current?.getSceneBackground?.(targetSceneId);
if (targetBg) preloadSceneBackground(targetBg);
```

### Step 3 — Actualizar el caller en `GameTouchCanvas.tsx`

```typescript
// ANTES:
const { handleTransitionTriggered, wrapRuntimeEventForTransitions } = useTransitionSystem({
  onBeforeChange: handleBeforeSceneChange,
});

// DESPUÉS — pasar la función de resolución de background:
const { handleTransitionTriggered, wrapRuntimeEventForTransitions } = useTransitionSystem({
  onBeforeChange: handleBeforeSceneChange,
  getSceneBackground: (id) => SCENES[id]?.background,
});
```

`SCENES` sigue importado en `GameTouchCanvas` (que es demo-específico y puede tenerlo).
El hook deja de conocer la estructura de datos de la demo.

### Step 4 — Validación

```bash
grep -n "demo-content" apps/web-demo/app/lib/engine/runtime/useTransitionSystem.ts
# Debe estar vacío.

cd apps/web-demo && npm run typecheck
```

---

## 📚 References

- `apps/web-demo/app/lib/engine/runtime/useTransitionSystem.ts` — archivo a modificar
- `apps/web-demo/app/components/GameTouchCanvas.tsx` — caller que pasa el callback
- Violación V4 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
