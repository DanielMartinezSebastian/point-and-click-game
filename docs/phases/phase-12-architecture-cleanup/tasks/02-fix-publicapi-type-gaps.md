# Task 12.2 — publicApi: completar tipos audio y GameItemDropOutcome

**Effort**: 30 min | **Blocks**: [12.8] | **Blocked by**: ninguna
**Scope**: `apps/web-demo/app/lib/engine/publicApi.ts`

---

## 🎯 Objetivo

La API pública tiene tipos incompletos respecto al engine-core:

1. `GameItemRule` (publicApi) no expone `dropSoundUrl` que existe en `ItemInteractionRule` (core).
2. `GameItemConfig` (publicApi) no expone `pickupSoundUrl` / `dropSoundUrl` que existen en `ItemDefinition` (core).
3. `GameItemDropOutcome` solo cubre `"consume" | "place" | "return"`, pero el core emite también `"rule-miss" | "unknown-item" | "on-player" | "pickup-blocked" | "pickup-success"`.

Un consumidor que usa la API pública para configurar audio de items o manejar todos los outcomes no puede hacerlo.

---

## ✅ Success Criteria

- [ ] `GameItemRule` en publicApi incluye `dropSoundUrl?: string`.
- [ ] `GameItemConfig` en publicApi incluye `pickupSoundUrl?: string` y `dropSoundUrl?: string`.
- [ ] `GameItemDropOutcome` cubre todos los valores que emite el core.
- [ ] Backward compatible: todos los campos nuevos son opcionales.
- [ ] `tsc` pasa en `apps/web-demo`.

---

## 📝 Instructions

### Step 1 — Localizar los tipos en publicApi.ts

Buscar en `apps/web-demo/app/lib/engine/publicApi.ts`:

```typescript
// GameItemRule — añadir campo de audio:
export interface GameItemRule {
  itemId: string;
  targetInteractionId: string;
  outcome: GameItemDropOutcome;
  consumedItemId?: string;
  placeAtPosition?: GameVec3;
+ dropSoundUrl?: string;       // Override del SFX de drop para esta regla concreta
}

// GameItemConfig — añadir campos de audio:
export interface GameItemConfig {
  id: string;
  label: string;
  thumbnailUrl: string;
+ pickupSoundUrl?: string;     // Override del SFX de pickup para este ítem
+ dropSoundUrl?: string;       // Override del SFX de drop para este ítem
}
```

### Step 2 — Ampliar GameItemDropOutcome

```typescript
// ANTES:
export type GameItemDropOutcome = "consume" | "place" | "return";

// DESPUÉS — alineado con GameEvent del core:
export type GameItemDropOutcome =
  | "consume"
  | "place"
  | "return"
  | "rule-miss"       // No hubo regla que matcheara el drop
  | "unknown-item"    // El ítem no está registrado
  | "on-player"       // Drop sobre el propio personaje (pickup de vuelta al inventario)
  | "pickup-blocked"  // Pickup bloqueado (ej. durante diálogo)
  | "pickup-success"; // Pickup completado con éxito
```

> **Nota de compatibilidad**: los valores nuevos solo aparecen en eventos emitidos por el runtime.
> El código existente que solo usa `"consume" | "place" | "return"` sigue compilando.

### Step 3 — Verificar alineación con core

```bash
# Comparar tipos en core vs publicApi
grep -n "dropSoundUrl\|pickupSoundUrl" packages/engine-core/src/game/types/index.ts
grep -n "dropSoundUrl\|pickupSoundUrl" apps/web-demo/app/lib/engine/publicApi.ts
# Deben coincidir tras el fix.

# Verificar GameItemDropOutcome vs GameEvent
grep -n "pickup-blocked\|pickup-success\|rule-miss\|unknown-item" packages/engine-core/src/game/events/types.ts
```

### Step 4 — Validación

```bash
cd apps/web-demo && npm run typecheck
```

---

## 📚 References

- `packages/engine-core/src/game/types/index.ts` — `ItemDefinition`, `ItemInteractionRule`
- `packages/engine-core/src/game/events/types.ts` — `GameEvent` outcomes
- Violación V7 del audit `docs/phases/phase-12-architecture-cleanup/README.md`
