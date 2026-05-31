# Task 12.1 — Core: eliminar window.__gameTrace, LogPort opcional

**Effort**: 30 min | **Blocks**: [12.8] | **Blocked by**: ninguna
**Scope**: `packages/engine-core/src/game/state/sceneStore.ts`

---

## 🎯 Objetivo

El `sceneStore` accede a `window.__gameTrace` (líneas 36–44) para logging de debug.
Esta es una API de browser en el core agnóstico — viola el principio fundamental.
La fix: reemplazar el acceso a `window` por un logger inyectable; por defecto solo `console.info`.

---

## ✅ Success Criteria

- [ ] `grep -n "window\." packages/engine-core/src/game/state/sceneStore.ts` → vacío.
- [ ] `logSceneStore` solo usa `console.info` por defecto.
- [ ] Se exporta `setSceneStoreLogger(fn)` para inyectar un logger custom (opcional, para debug en browser).
- [ ] Los tests existentes de sceneStore siguen pasando.
- [ ] `tsc` pasa en `packages/engine-core`.

---

## 📝 Instructions

### Step 1 — Editar `packages/engine-core/src/game/state/sceneStore.ts`

Reemplazar la función `logSceneStore` (líneas 34–46 actuales):

```typescript
// ANTES:
function logSceneStore(event: string, payload: Record<string, unknown>) {
  if (!SHOULD_LOG_STATE_TRANSITIONS) return;
  if (typeof window !== "undefined") {
    const nextEntry = { scope: "scene-store", event, payload, ts: Date.now() };
    const currentTrace =
      (window as unknown as { __gameTrace?: unknown[] }).__gameTrace ?? [];
    (window as unknown as { __gameTrace: unknown[] }).__gameTrace = [
      ...currentTrace,
      nextEntry,
    ].slice(-300);
  }
  console.info(`[scene-store] ${event}`, payload);
}

// DESPUÉS:
type SceneStoreLogger = (event: string, payload: Record<string, unknown>) => void;

let _logger: SceneStoreLogger | null = null;

/**
 * Inyecta un logger custom para debug de scene-store (p.ej. window.__gameTrace).
 * Si no se llama, el store usa console.info en desarrollo.
 * Llamar con null para deshabilitar el logger.
 */
export function setSceneStoreLogger(logger: SceneStoreLogger | null): void {
  _logger = logger;
}

function logSceneStore(event: string, payload: Record<string, unknown>) {
  if (!SHOULD_LOG_STATE_TRANSITIONS) return;
  if (_logger) {
    _logger(event, payload);
  } else {
    console.info(`[scene-store] ${event}`, payload);
  }
}
```

### Step 2 — Mover el trace a platform-web (optional bridge)

En `apps/web-demo/app/lib/platform-web.ts`, añadir al final (opcional, para mantener el trace en dev):

```typescript
// Debug trace bridge — conecta el logger del sceneStore al window.__gameTrace
// Solo en dev; no afecta al core.
import { setSceneStoreLogger } from "@pointclick-engine/engine-core";

if (process.env.NODE_ENV !== "production") {
  setSceneStoreLogger((event, payload) => {
    const nextEntry = { scope: "scene-store", event, payload, ts: Date.now() };
    const w = window as unknown as { __gameTrace?: unknown[] };
    w.__gameTrace = [...(w.__gameTrace ?? []), nextEntry].slice(-300);
    console.info(`[scene-store] ${event}`, payload);
  });
}
```

> **Nota**: este paso es opcional. Si no interesa mantener el trace, simplemente no se llama a `setSceneStoreLogger`.

### Step 3 — Validación

```bash
# Verificar que window desapareció del core
grep -n "window\." packages/engine-core/src/game/state/sceneStore.ts
# Output esperado: vacío

# Tests
cd packages/engine-core && npm test -- --testPathPattern=sceneStore
```

---

## 📚 References

- `docs/architecture/03-rules-core-vs-render.md` — regla de oro
- `docs/architecture/04-platform-ports.md` — patrón de inyección de adapters
- Violación V1 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
