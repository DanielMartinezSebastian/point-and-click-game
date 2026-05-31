# Task 12.7 — engine-renderer-r3f: extraer GameCanvasCore; publicApi sin GameTouchCanvas

**Effort**: 2h | **Blocks**: ninguna | **Blocked by**: [12.4]
**Scope**: `apps/web-demo/app/components/GameTouchCanvas.tsx` + `apps/web-demo/app/lib/engine/publicApi.ts` + `packages/engine-renderer-r3f/`

---

## 🎯 Objetivo

`publicApi.ts` exporta `GameViewport` que internamente envuelve `GameTouchCanvas` (líneas 34, 541–546).
`GameTouchCanvas` importa SCENES, stores de la demo, getRandomPhrase, etc.
Esto hace que la "API pública" exporte código no portable.

La fix tiene dos partes:

1. Extraer de `GameTouchCanvas` la parte genérica de R3F (`<Canvas>` + providers + loops)
   como `GameCanvasCore` en `engine-renderer-r3f`.
2. `publicApi.ts` exporta `GameViewport` que compose `GameCanvasCore` (no `GameTouchCanvas`).
   La demo sigue usando `GameTouchCanvas` directamente (con todo su contenido específico).

**`GameCanvasCore`** acepta únicamente props genéricas del engine:
- `runtime` (GameRuntime)
- `debug?: boolean`
- `children` (para que la demo inyecte sus sprites/escenas)
- `onRuntimeEvent?: (e: GameEvent) => void`

---

## ✅ Success Criteria

- [ ] `packages/engine-renderer-r3f/src/components/GameCanvasCore.tsx` creado.
- [ ] `GameCanvasCore` exportado desde `engine-renderer-r3f`.
- [ ] `publicApi.ts` exporta `GameViewport` wrapping `GameCanvasCore` (sin import de `GameTouchCanvas`).
- [ ] `grep -n "GameTouchCanvas\|components/GameTouchCanvas" apps/web-demo/app/lib/engine/publicApi.ts` → vacío.
- [ ] La demo (`page.tsx` o donde use `<GameTouchCanvas>`) sigue funcionando sin cambios.
- [ ] `tsc` pasa en ambos packages y en web-demo.

---

## 📝 Instructions

### Step 1 — Identificar qué es genérico en GameTouchCanvas

Leer `apps/web-demo/app/components/GameTouchCanvas.tsx` y separar:

**Genérico → GameCanvasCore**:
- Setup de `<Canvas>` con R3F (camera, renderer settings)
- `useGameLoop` / `useFrame` wiring
- Listeners de input de bajo nivel (click, touch) → emiten al runtime
- Fade overlay ref + callbacks (ya parametrizados con `onBeforeChange`)
- `onRuntimeEvent` prop callback

**Demo-específico → queda en GameTouchCanvas**:
- Import de `SCENES`
- Todos los `use*Store` de la demo
- `useTransitionSystem`, `useDoorSystem`, `useInventoryRuntimeController`
- `<DavidSprite>`, `<SceneBackgroundPlane>`, etc.
- `getRandomPhrase`

### Step 2 — Crear GameCanvasCore.tsx

En `packages/engine-renderer-r3f/src/components/GameCanvasCore.tsx`:

```typescript
import { Canvas } from "@react-three/fiber";
import type { GameRuntime } from "@pointclick-engine/engine-core";
import type { GameEvent } from "@pointclick-engine/engine-core";
import { useGameLoopR3F } from "../adapters/gameLoopR3F";

export interface GameCanvasCoreProps {
  runtime: GameRuntime;
  debug?: boolean;
  onRuntimeEvent?: (event: GameEvent) => void;
  children?: React.ReactNode;
  /** Clases CSS para el contenedor externo. */
  className?: string;
}

export function GameCanvasCore({
  runtime,
  debug,
  onRuntimeEvent,
  children,
  className,
}: GameCanvasCoreProps) {
  useGameLoopR3F(runtime); // conecta useFrame al game loop del core

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }} className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: false }}
      >
        {children}
      </Canvas>
    </div>
  );
}
```

> **Nota**: Extraer solo lo que sea verdaderamente genérico. Si el setup de `<Canvas>` en
> `GameTouchCanvas` tiene opciones muy específicas de la demo, documentarlas como props
> en lugar de hardcodearlas.

### Step 3 — Exportar desde engine-renderer-r3f

En `packages/engine-renderer-r3f/src/components/index.ts`:

```typescript
export { GameCanvasCore } from "./GameCanvasCore";
export type { GameCanvasCoreProps } from "./GameCanvasCore";
```

En `packages/engine-renderer-r3f/src/index.ts`:
```typescript
export * from "./components";
```

### Step 4 — Actualizar publicApi.ts para usar GameCanvasCore

```typescript
// ANTES (publicApi.ts líneas 34, 541-546):
import GameTouchCanvas from "../../components/GameTouchCanvas";
// ...
export function GameViewport({ debug, onRuntimeEvent }: GameViewportProps) {
  return createElement(GameTouchCanvas as ComponentType<GameViewportProps>, { debug, onRuntimeEvent });
}

// DESPUÉS:
import { GameCanvasCore } from "@pointclick-engine/engine-renderer-r3f";
// ...
export function GameViewport({ debug, onRuntimeEvent }: GameViewportProps) {
  const runtime = getGameRuntime();
  return createElement(GameCanvasCore, { runtime, debug, onRuntimeEvent });
}
```

### Step 5 — Verificar que la demo no se rompe

La demo usa `<GameTouchCanvas>` directamente (en `app/page.tsx` o similar), no `<GameViewport>`.
Verificar que `GameTouchCanvas` sigue funcionando igual — solo `publicApi.ts` cambia su referencia.

```bash
grep -rn "GameTouchCanvas\|GameViewport" apps/web-demo/app/ --include="*.tsx" --include="*.ts"
```

### Step 6 — Validación

```bash
cd packages/engine-renderer-r3f && npm run build
grep -n "GameTouchCanvas\|components/GameTouchCanvas" apps/web-demo/app/lib/engine/publicApi.ts
# Debe estar vacío.
cd apps/web-demo && npm run typecheck
```

---

## ⚠️ Nota de scope

Esta tarea es la más compleja de la fase. Si `GameTouchCanvas` está muy entrelazado,
es aceptable en una primera iteración que `GameCanvasCore` sea un wrapper muy delgado
(solo `<Canvas>` + `useGameLoopR3F`) y que `GameViewport` compose ambos componentes
en lugar de replicar toda la lógica. El objetivo mínimo es que `publicApi.ts` no importe
`GameTouchCanvas` directamente.

---

## 📚 References

- `apps/web-demo/app/components/GameTouchCanvas.tsx` — componente a analizar
- `apps/web-demo/app/lib/engine/publicApi.ts` — líneas 34, 541–546
- `packages/engine-renderer-r3f/src/adapters/gameLoopR3F.ts` — adapter del game loop
- Violación V3 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
