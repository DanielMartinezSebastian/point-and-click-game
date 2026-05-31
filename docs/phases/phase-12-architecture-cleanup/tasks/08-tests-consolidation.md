# Task 12.8 — Tests: consolidación de cobertura fase 12

**Effort**: 2h | **Blocks**: ninguna | **Blocked by**: [12.1, 12.3, 12.4, 12.5, 12.6]
**Scope**: `packages/engine-core/__tests__/`, `packages/engine-renderer-r3f/src/__tests__/`, `apps/web-demo/app/lib/engine/`

---

## 🎯 Objetivo

Añadir tests que cubran:
1. Las correcciones de la fase 12 (cada fix debe tener un test que lo proteja de regresión).
2. Funcionalidades añadidas en fases 8–11 que actualmente no tienen tests:
   - Fade curtain de transición de escena (`onBeforeChange` / `onBackgroundReady`)
   - `useTransitionSystem` con `getSceneBackground` callback
   - `useClickToMoveController` (waypoint, stuck detection, arrival)
   - `useKeyboardMovementInput` (WASD → vector)
   - DI contract en `publicApi` (inventory/dialog adapters)

---

## ✅ Success Criteria

- [ ] ≥ 20 tests nuevos añadidos en total.
- [ ] `packages/engine-core/__tests__/sceneStoreAgnosticism.test.ts` — verifica que el store no usa `window`.
- [ ] `packages/engine-renderer-r3f/src/__tests__/useClickToMoveController.test.ts` — waypoint, stuck, arrival.
- [ ] `packages/engine-renderer-r3f/src/__tests__/useKeyboardMovementInput.test.ts` — normalización teclas.
- [ ] `apps/web-demo/app/lib/engine/publicApi.di.test.ts` — DI contract de adapters.
- [ ] `apps/web-demo/app/lib/engine/runtime/useTransitionSystem.test.ts` — callbacks y precarga.
- [ ] Todos los tests pasan: `npm run test` desde root.

---

## 📝 Test Specs

### Test File 1: `packages/engine-core/__tests__/sceneStoreAgnosticism.test.ts`

```typescript
import { useSceneStore, setSceneStoreLogger } from "../src/game/state/sceneStore";

describe("sceneStore — agnosticism", () => {
  it("funciona sin window disponible (entorno Node.js)", () => {
    // En el test runner (Node.js), window no existe.
    // El store no debe lanzar al mutar estado.
    expect(() => {
      useSceneStore.getState().setScene("scene-1", { id: "scene-1" } as never);
    }).not.toThrow();
  });

  it("acepta un logger inyectado y lo invoca al mutar estado", () => {
    const log = jest.fn();
    setSceneStoreLogger(log);
    useSceneStore.getState().setScene("scene-1", { id: "scene-1" } as never);
    expect(log).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    setSceneStoreLogger(null); // cleanup
  });

  it("no invoca window.__gameTrace aunque exista en el entorno", () => {
    const trace: unknown[] = [];
    (global as unknown as { __gameTrace: unknown[] }).__gameTrace = trace;
    useSceneStore.getState().setScene("scene-2", { id: "scene-2" } as never);
    // Sin logger inyectado no debe tocar __gameTrace
    expect(trace).toHaveLength(0);
    delete (global as unknown as { __gameTrace?: unknown[] }).__gameTrace;
  });
});
```

### Test File 2: `packages/engine-renderer-r3f/src/__tests__/useClickToMoveController.test.ts`

> Requiere `@testing-library/react-hooks` o `renderHook` de `@testing-library/react`.

```typescript
import { renderHook, act } from "@testing-library/react";
import { useClickToMoveController } from "../hooks/useClickToMoveController";

describe("useClickToMoveController", () => {
  it("empieza sin target activo", () => {
    const { result } = renderHook(() => useClickToMoveController());
    expect(result.current.hasTarget()).toBe(false);
  });

  it("setRoute establece waypoints y hasTarget devuelve true", () => {
    const { result } = renderHook(() => useClickToMoveController());
    act(() => {
      result.current.setRoute([{ x: 1, z: 0 }, { x: 2, z: 0 }]);
    });
    expect(result.current.hasTarget()).toBe(true);
  });

  it("cancelTarget limpia el estado", () => {
    const { result } = renderHook(() => useClickToMoveController());
    act(() => { result.current.setRoute([{ x: 1, z: 0 }]); });
    act(() => { result.current.cancelTarget(); });
    expect(result.current.hasTarget()).toBe(false);
  });

  it("detecta arrival cuando el jugador está dentro del threshold", () => {
    const onArrival = jest.fn();
    const { result } = renderHook(() =>
      useClickToMoveController({ onArrival, arrivalThreshold: 0.5 })
    );
    act(() => { result.current.setTarget({ x: 1, z: 0 }); });
    // Simular que el jugador llegó al punto
    act(() => { result.current.registerProgress({ x: 1, z: 0 }); });
    expect(onArrival).toHaveBeenCalled();
  });
});
```

### Test File 3: `packages/engine-renderer-r3f/src/__tests__/useKeyboardMovementInput.test.ts`

```typescript
import { renderHook, act } from "@testing-library/react";
import { useKeyboardMovementInput } from "../adapters/useKeyboardMovementInput";

function fireKey(key: string, type: "keydown" | "keyup") {
  window.dispatchEvent(new KeyboardEvent(type, { key }));
}

describe("useKeyboardMovementInput", () => {
  it("vector inicial es cero", () => {
    const { result } = renderHook(() => useKeyboardMovementInput());
    expect(result.current.x).toBe(0);
    expect(result.current.z).toBe(0);
  });

  it("W produce z negativo (avanzar)", () => {
    const { result } = renderHook(() => useKeyboardMovementInput());
    act(() => fireKey("w", "keydown"));
    expect(result.current.z).toBeLessThan(0);
  });

  it("S produce z positivo (retroceder)", () => {
    const { result } = renderHook(() => useKeyboardMovementInput());
    act(() => fireKey("s", "keydown"));
    expect(result.current.z).toBeGreaterThan(0);
  });

  it("soltar tecla vuelve el vector a cero", () => {
    const { result } = renderHook(() => useKeyboardMovementInput());
    act(() => fireKey("w", "keydown"));
    act(() => fireKey("w", "keyup"));
    expect(result.current.z).toBe(0);
  });

  it("ArrowLeft produce x negativo", () => {
    const { result } = renderHook(() => useKeyboardMovementInput());
    act(() => fireKey("ArrowLeft", "keydown"));
    expect(result.current.x).toBeLessThan(0);
  });
});
```

### Test File 4: `apps/web-demo/app/lib/engine/publicApi.di.test.ts`

```typescript
import { createGameRuntime } from "./publicApi";

describe("publicApi — DI adapters contract", () => {
  it("inventory:toggle llama al adapter si se inyecta", () => {
    const toggle = jest.fn();
    const runtime = createGameRuntime({
      inventoryAdapter: { toggle, isOpen: () => false },
    });
    runtime.executeCommand({ type: "inventory:toggle" });
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("inventory:toggle es no-op si no se inyecta adapter", () => {
    const runtime = createGameRuntime({});
    expect(() => {
      runtime.executeCommand({ type: "inventory:toggle" });
    }).not.toThrow();
  });

  it("dialog:trigger llama al adapter con texto y key", () => {
    const show = jest.fn();
    const runtime = createGameRuntime({
      dialogAdapter: { show, hide: jest.fn() },
    });
    runtime.executeCommand({ type: "dialog:trigger", text: "Hola", dialogKey: "greeting" });
    expect(show).toHaveBeenCalledWith("Hola", "greeting");
  });
});
```

### Test File 5: `apps/web-demo/app/lib/engine/runtime/useTransitionSystem.test.ts`

```typescript
import { renderHook } from "@testing-library/react";
import { useTransitionSystem } from "./useTransitionSystem";

describe("useTransitionSystem", () => {
  it("llama onBeforeChange al disparar una transición", () => {
    const onBeforeChange = jest.fn();
    const getSceneBackground = jest.fn().mockReturnValue("/bg/scene2.jpg");

    const { result } = renderHook(() =>
      useTransitionSystem({ onBeforeChange, getSceneBackground })
    );

    // Simular evento de transición desde el runtime
    result.current.handleTransitionTriggered({ targetSceneId: "scene-2" } as never);

    expect(onBeforeChange).toHaveBeenCalledTimes(1);
    expect(getSceneBackground).toHaveBeenCalledWith("scene-2");
  });

  it("no importa SCENES — no tiene referencias a demo-content", () => {
    // Este test es estructural: si el import existe, la mock falla
    // y el build rompe porque demo-content no existe en el renderer.
    // Pasa simplemente si el hook importa sin error.
    expect(() =>
      renderHook(() => useTransitionSystem({}))
    ).not.toThrow();
  });
});
```

---

## 📝 Instructions

### Step 1 — Crear los archivos de test

Crear cada archivo listado arriba en su ubicación correspondiente.

### Step 2 — Instalar dependencias de test si faltan

```bash
# Para tests de hooks de React en el renderer:
cd packages/engine-renderer-r3f
grep "testing-library" package.json || npm install --save-dev @testing-library/react @testing-library/react-hooks
```

### Step 3 — Ejecutar todos los tests

```bash
npm run test --workspaces
# O desde root si hay script configurado:
npm run test
```

### Step 4 — Verificar cobertura mínima

- Al menos 20 nuevos assertions pasando.
- Sin tests en rojo.

---

## 📚 References

- `docs/phases/phase-12-architecture-cleanup/README.md` — tabla de gaps de tests
- `packages/engine-core/__tests__/sceneStore.test.ts` — patrón de tests existentes del store
- `packages/engine-renderer-r3f/src/__tests__/usePlayerWalkAnimation.test.ts` — patrón tests renderer
