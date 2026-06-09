# Task 02-state-partition-classification

**Effort**: 1 day | **Blocks**: 04,06 | **Blocked by**: 01

---

## 🎯 Objetivo

Registry que mapea cada `GameEvent["type"]` a su clase de sincronización (`world` / `presence` /
`private`). Única fuente de verdad sobre qué cruza la red. Resuelve el requisito 2 (compartido vs
privado).

---

## 📁 Archivos

- **CREAR** `packages/engine-core/src/game/net/eventClassification.ts`
- **CREAR** `packages/engine-core/src/__tests__/eventClassification.test.ts`
- **EDITAR** `packages/engine-core/src/index.ts` (export `./game/net`) — o crear `game/net/index.ts`

---

## ✅ Success Criteria

- [ ] `SyncClass`, `EVENT_CLASSIFICATION` (mapa exhaustivo), `classifyEvent`, `shouldReplicate`, `isWorld`, `isPresence`
- [ ] El mapa usa `satisfies Record<GameEventType, SyncClass[]>` → si falta un tipo, **falla la compilación**
- [ ] `item:pickedUp` = `["world","private"]`; `dialog:triggered` = `["private"]`; `player:moved` = `["presence"]`
- [ ] Tests verdes
- [ ] No breaking changes

---

## 📝 Step 1 — `game/net/eventClassification.ts`

```ts
import type { GameEventType } from "../events/types";

/** Clase de sincronización de un evento. Un evento puede pertenecer a varias. */
export type SyncClass = "world" | "presence" | "private";

/**
 * Clasificación exhaustiva. `satisfies` obliga a cubrir TODOS los GameEventType:
 * si añades un evento nuevo y no lo clasificas, TypeScript falla aquí.
 *
 * - world    → estado compartido, replicado a todos, persistente (puertas, ítems colocados).
 * - presence → efímero por jugador, fan-out a misma escena (posición, escena).
 * - private  → local, NUNCA cruza la red (diálogos, audio, animación de walk).
 */
export const EVENT_CLASSIFICATION = {
  // Scene
  "scene:changed": ["presence"],            // cambia MI escena → actualiza mi presence
  "scene:respawnRequested": ["private"],
  // Player
  "player:moved": ["presence"],             // alta frecuencia; throttle en el borde
  "player:collided": ["private"],
  // Inventory  (pickup quita del world y añade a mi inventario)
  "item:pickedUp": ["world", "private"],
  "item:dropped": ["world"],                // place/consume mutan placedItems compartidos
  // Dialog
  "dialog:triggered": ["private"],
  "dialog:dismissed": ["private"],
  // Transitions
  "transition:triggered": ["private"],
  "transition:started": ["private"],
  "transition:completed": ["presence"],     // cambio de escena propio
  "transition:colliderClicked": ["private"],
  // Player walking (se deriva de presence en remotos)
  "player:walkStarted": ["private"],
  "player:walkCompleted": ["private"],
  "player:walkAborted": ["private"],
  // Audio (local)
  "audio:sfxRequested": ["private"],
  "audio:musicRequested": ["private"],
  "audio:musicStopped": ["private"],
  "audio:settingsChanged": ["private"],
  // i18n (local)
  "i18n:localeChanged": ["private"],
  "i18n:dictionaryUpdated": ["private"],
} satisfies Record<GameEventType, SyncClass[]>;

export function classifyEvent(type: GameEventType): SyncClass[] {
  return EVENT_CLASSIFICATION[type] ?? ["private"];
}
export const isWorld = (t: GameEventType) => classifyEvent(t).includes("world");
export const isPresence = (t: GameEventType) => classifyEvent(t).includes("presence");
/** ¿Debe salir a la red? (world o presence). Los `private` jamás. */
export const shouldReplicate = (t: GameEventType) => isWorld(t) || isPresence(t);
```

> **NOTA para task 04**: cuando añadas los eventos `net:playerJoined` / `net:playerLeft` /
> `net:status`, **debes** clasificarlos aquí (probablemente `["private"]`, son locales) o el
> `satisfies` romperá la compilación. Eso es intencional.

## 📝 Step 2 — export

Crea `packages/engine-core/src/game/net/index.ts`:
```ts
export * from "./eventClassification";
```
Y en `packages/engine-core/src/index.ts` añade: `export * from "./game/net";`

## 📝 Step 3 — Test `__tests__/eventClassification.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  EVENT_CLASSIFICATION, classifyEvent, shouldReplicate, isWorld,
} from "../game/net/eventClassification";

describe("eventClassification", () => {
  it("classifies pickup as world+private", () => {
    expect(classifyEvent("item:pickedUp")).toEqual(["world", "private"]);
  });
  it("dialog never crosses the wire", () => {
    expect(shouldReplicate("dialog:triggered")).toBe(false);
  });
  it("player:moved is presence", () => {
    expect(shouldReplicate("player:moved")).toBe(true);
    expect(isWorld("player:moved")).toBe(false);
  });
  it("every classified type has at least one class", () => {
    for (const classes of Object.values(EVENT_CLASSIFICATION)) {
      expect(classes.length).toBeGreaterThan(0);
    }
  });
});
```

## ✅ Verificación
`npm test -w packages/engine-core` verde. `npm run build -w packages/engine-core` compila
(prueba la exhaustividad del `satisfies`).

## 📚 References
- `packages/engine-core/src/game/events/types.ts` (union completa de `GameEvent`)
- `docs/architecture/09-multiplayer.md` §2
