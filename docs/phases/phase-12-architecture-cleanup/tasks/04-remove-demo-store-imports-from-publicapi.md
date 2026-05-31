# Task 12.4 — publicApi: eliminar imports de demo stores, DI para inventory y dialog

**Effort**: 1.5h | **Blocks**: [12.7, 12.8] | **Blocked by**: ninguna
**Scope**: `apps/web-demo/app/lib/engine/publicApi.ts`

---

## 🎯 Objetivo

`publicApi.ts` importa directamente dos stores internas de la demo (líneas 35–36):

```typescript
import { useInventoryStore } from "../../store/inventoryStore";
import { useDialogStore } from "../../store/dialogStore";
```

Y los usa para los comandos `inventory:toggle` y `dialog:trigger`. Esto hace que la "API pública"
dependa de implementaciones internas de la demo — cualquier consumidor externo que llame
`createGameRuntime()` arrastraría esas stores como dependencias implícitas.

La fix: `createGameRuntime()` acepta adapters opcionales para inventory y dialog.
La demo pasa sus stores actuales como adapters. El contrato del API permanece estable.

---

## ✅ Success Criteria

- [ ] `grep -n "store/inventoryStore\|store/dialogStore" apps/web-demo/app/lib/engine/publicApi.ts` → vacío.
- [ ] `createGameRuntime()` acepta `{ inventoryAdapter?, dialogAdapter? }` en su config.
- [ ] Si no se pasan adapters, los comandos `inventory:toggle` y `dialog:trigger` son no-op (no lanzan).
- [ ] La demo pasa los adapters en `GameTouchCanvas` o donde llame a `createGameRuntime`.
- [ ] Todos los tests de publicApi siguen pasando.
- [ ] `tsc` pasa.

---

## 📝 Instructions

### Step 1 — Definir interfaces de adapter en publicApi.ts

Añadir antes de `GameRuntimeConfig`:

```typescript
/** Adapter para conectar el engine con la UI de inventario del host. */
export interface InventoryUIAdapter {
  /** Muestra u oculta el panel de inventario. */
  toggle(): void;
  /** Devuelve si el panel está abierto actualmente. */
  isOpen(): boolean;
}

/** Adapter para conectar el engine con el sistema de diálogos del host. */
export interface DialogUIAdapter {
  /** Muestra un diálogo. `dialogKey` puede usarse para lookup de textos. */
  show(text: string, dialogKey?: string): void;
  /** Oculta el diálogo activo. */
  hide(): void;
}
```

### Step 2 — Añadir adapters a GameRuntimeConfig

```typescript
export interface GameRuntimeConfig {
  // ...campos existentes...
  /** Adapter de UI para inventory. Si no se pasa, inventory:toggle es no-op. */
  inventoryAdapter?: InventoryUIAdapter;
  /** Adapter de UI para diálogos. Si no se pasa, dialog:trigger es no-op. */
  dialogAdapter?: DialogUIAdapter;
}
```

### Step 3 — Actualizar createGameRuntime para usar adapters

Localizar el registro de comandos `inventory:toggle` y `dialog:trigger` en `publicApi.ts`
(actualmente importan los stores directamente). Reemplazar:

```typescript
// ANTES:
commands.register("inventory:toggle", () => {
  useInventoryStore.getState().toggle();
});
commands.register("dialog:trigger", (cmd) => {
  const { text, dialogKey } = cmd as { text: string; dialogKey?: string };
  useDialogStore.getState().show(text, dialogKey);
});

// DESPUÉS:
commands.register("inventory:toggle", () => {
  config.inventoryAdapter?.toggle();
});
commands.register("dialog:trigger", (cmd) => {
  const { text, dialogKey } = cmd as { text: string; dialogKey?: string };
  config.dialogAdapter?.show(text, dialogKey);
});
```

Asegurarse de que `config` es el parámetro de `createGameRuntime`.

### Step 4 — Eliminar los imports de demo stores

```typescript
// Eliminar estas líneas de publicApi.ts:
- import { useInventoryStore } from "../../store/inventoryStore";
- import { useDialogStore } from "../../store/dialogStore";
```

### Step 5 — Actualizar la demo (GameTouchCanvas o page.tsx) para pasar adapters

Donde se llame a `createGameRuntime(...)` en la demo, añadir los adapters:

```typescript
import { useInventoryStore } from "../../store/inventoryStore";
import { useDialogStore } from "../../store/dialogStore";

// En el caller de createGameRuntime:
createGameRuntime({
  // ...config existente...
  inventoryAdapter: {
    toggle: () => useInventoryStore.getState().toggle(),
    isOpen: () => useInventoryStore.getState().isOpen,
  },
  dialogAdapter: {
    show: (text, key) => useDialogStore.getState().show(text, key),
    hide: () => useDialogStore.getState().hide(),
  },
});
```

### Step 6 — Verificar

```bash
grep -n "store/inventoryStore\|store/dialogStore" apps/web-demo/app/lib/engine/publicApi.ts
# Debe estar vacío.

cd apps/web-demo && npm run typecheck
cd apps/web-demo && npm test -- --testPathPattern=publicApi
```

---

## 📚 References

- `apps/web-demo/app/lib/engine/publicApi.ts` — líneas 35–36, sección de registro de comandos
- `apps/web-demo/app/store/inventoryStore.ts` — store de inventario
- `apps/web-demo/app/store/dialogStore.ts` — store de diálogo
- `docs/architecture/04-platform-ports.md` — patrón de inyección de adapters
- Violación V2 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
