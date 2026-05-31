# Task 13.6 — Core tests: store + translator + registry + headless

**Effort**: 1h | **Blocks**: [13.7] | **Blocked by**: [13.3, 13.4, 13.5]

---

## 🎯 Objetivo

Cobertura de tests para todo el core de i18n. Vitest, sin DOM. Mínimo 35 tests nuevos.

---

## ✅ Success Criteria

- [ ] `packages/engine-core/src/__tests__/i18nStore.test.ts` cubre store.
- [ ] `packages/engine-core/src/__tests__/translator.test.ts` cubre translate / getRandomPhrase / interpolación / matchLocale.
- [ ] `packages/engine-core/src/__tests__/registry.test.ts` cubre merge, overwrite warning, getDictionary.
- [ ] `packages/engine-core/src/__tests__/headlessI18n.test.ts` cubre adapter (detect/persist/clear + grabación).
- [ ] `packages/engine-core/src/__tests__/i18nBridge.test.ts` cubre emisión `i18n:localeChanged`.
- [ ] Total ≥ 35 tests nuevos. `npm run test` verde.

---

## 📝 Instructions

### Step 1 — `i18nStore.test.ts`

Mínimos a cubrir (8+ tests):

```typescript
- create with default config → state matches DEFAULT_I18N_CONFIG.
- setLocale("en") cuando está disponible → updates + emit.
- setLocale("xx") no disponible → fallback al primero + warn (spyOn console.warn).
- setLocale al mismo locale → NO emite.
- setAvailableLocales(["es","en"]) → state.availableLocales actualizado.
- subscribe + unsubscribe → listener no se llama tras unsubscribe.
- reset() → vuelve a config inicial + emite.
- bindPort: port.detectLocale retorna "en" → store arranca en "en"; setLocale("es") llama port.persistLocale("es").
```

### Step 2 — `translator.test.ts`

Mínimos (10+ tests):

```typescript
- translate(missingKey) → retorna la key.
- translate(key) en locale actual → primera phrase.
- translate(key) cuando solo existe en fallback → usa fallback.
- translate con vars { name: "Dave" } → reemplaza {{name}}.
- translate con vars vacío → mantiene {{var}} literal.
- translate con override locale opt → ignora locale activo.
- getRandomPhrase con random determinista → siempre primer elemento si random=()=>0.
- getRandomPhrase con random=()=>0.999 → último elemento.
- getRandomPhrase sin phrases → retorna key.
- matchLocale("es-MX", ["es","en"]) → "es".
- matchLocale("fr-FR", ["es","en"]) → null.
- matchLocale("en", ["es","en"]) → "en".
```

### Step 3 — `registry.test.ts`

Mínimos (6+ tests):

```typescript
- registerDictionary("es", { a: { phrases:["x"] } }) → getDictionary("es").a === entry.
- registerDictionary dos veces con keys distintas → merge.
- registerDictionary dos veces con misma key → warn + segunda gana.
- registerDictionaries({ es:..., en:... }) → ambos registrados.
- clearRegistry() → getDictionary devuelve undefined.
- getDictionary("xx") inexistente → undefined.
```

### Step 4 — `headlessI18n.test.ts`

Mínimos (5+ tests):

```typescript
- new HeadlessI18nAdapter() → detectLocale() === null.
- new HeadlessI18nAdapter("en") → detectLocale() === "en" + calls registra.
- persistLocale("es") → siguiente detectLocale === "es".
- clearLocale() → detectLocale === null.
- reset("fr") → calls vacío + detectLocale === "fr".
```

### Step 5 — `i18nBridge.test.ts`

Mínimos (3+ tests):

```typescript
- setupI18nBridge(bus); setLocale("en") emite { type:"i18n:localeChanged", locale:"en", previous:"<initial>" }.
- setLocale al mismo locale → NO emite.
- unsubscribe → setLocale no emite.
```

### Step 6 — Helper común

En `packages/engine-core/src/__tests__/_helpers/i18n.ts`:

```typescript
export function freshI18n(config = { defaultLocale:"en", fallbackLocale:"en", availableLocales:["es","en"] }) {
  resetI18nStore(config);
  clearRegistry();
}
```

Llamar en `beforeEach`.

### Step 7 — Validación

```bash
cd packages/engine-core && npm run test
```

Esperar ≥ 35 nuevos tests verdes.

---

## 📚 References

- Tests existentes en `packages/engine-core/src/__tests__/` — patrón de helpers / vitest.
- Task 13.3, 13.4, 13.5 — código bajo test.
