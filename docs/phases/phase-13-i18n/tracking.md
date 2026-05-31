# Phase 13 — Progress Tracking

**Phase**: 13 — i18n / Localization System
**Status**: Completed
**Started**: 2026-05-31
**Completed**: 2026-05-31

---

## Sprint 1 — Core agnóstico

- [x] [13.1 — Core types: Locale, DialogDictionary, I18nConfig](tasks/01-core-types.md)
- [x] [13.2 — Core port: I18nPort + HeadlessI18nAdapter](tasks/02-i18n-port.md)
- [x] [13.3 — Core state: i18nStore + persistencia via port](tasks/03-i18n-store.md)
- [x] [13.4 — Core: registerDictionary + translate + getRandomPhrase + interpolación](tasks/04-translator-helpers.md)
- [x] [13.5 — Core commands + events de i18n](tasks/05-commands-events.md)
- [x] [13.6 — Core tests: store + translator + registry + headless](tasks/06-core-tests.md)

## Sprint 2 — Platform + renderer

- [x] [13.7 — Platform: webI18nAdapter (localStorage + navigator + SSR-safe)](tasks/07-web-i18n-adapter.md)
- [x] [13.8 — R3F: useI18n + useLocaleDetection + integración runtime](tasks/08-r3f-hooks.md)
- [x] [13.9 — R3F componente: LocaleSwitcher (headless + estilos default)](tasks/09-locale-switcher.md)

## Sprint 3 — Integraciones, demo y API pública

- [x] [13.10 — Docs: recetas Next.js (browser, native i18n, next-intl)](tasks/10-nextjs-recipes.md)
- [x] [13.11 — Demo: migrar dialogs + montar switcher en inventory](tasks/11-demo-migration.md)
- [x] [13.12 — Public API: exports, contrato v1, CHANGELOG](tasks/12-public-api-docs.md)

---

## Post-Phase Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Type-check passing
- [ ] Build passing (incluido `apps/web-demo` en modo Next.js build)
- [ ] `grep -rE "navigator\.|localStorage|document\.|cookies|next/|next-intl" packages/engine-core/src/` → vacío
- [ ] `grep -rE "navigator\.|localStorage|document\.|cookies|next/|next-intl" packages/engine-renderer-r3f/src/` → vacío (los hooks NO consumen browser globals directamente)
- [ ] Backward compatibility: `apps/web-demo/demo-content/dialogs/getRandomPhrase.ts` legacy wrapper sigue funcionando
- [ ] Persistencia del locale verificada (recarga manual mantiene elección)
- [ ] Detección automática verificada (browser en `en-*` arranca en `en`; resto arranca en `es`)
- [ ] `<LocaleSwitcher />` montado en `InventoryUI` cambia el idioma del speech bubble en vivo
- [ ] 3 recetas Next.js documentadas y enlazadas desde el README de la fase
- [ ] Arquitectura respetada (Core agnóstico, R3F renderer-specific, Platform en demo)

---

## Deliverables esperados

### Core (engine-core) — ~860 LOC
- Types: `Locale`, `DialogKey`, `DialogEntry`, `DialogDictionary`, `LocaleDictionaries`, `I18nConfig`, `I18nState`
- Port: `I18nPort` + `HeadlessI18nAdapter`
- State: `i18nStore` (subscribe / setLocale / setAvailableLocales / bindPort)
- Registry: `registerDictionary`, `registerDictionaries`, `getDictionary`
- Translator: `translate(key, { vars })`, `getRandomPhrase(key)`, `matchLocale(candidate, available)`
- Commands: `i18n:setLocale`, `i18n:registerDictionary`
- Events: `i18n:localeChanged`, `i18n:dictionaryUpdated`
- Tests: ≥35 tests nuevos

### Renderer R3F (engine-renderer-r3f) — ~280 LOC
- Hook: `useI18n()` → `{ locale, setLocale, t, getPhrase, availableLocales }`
- Hook: `useLocaleDetection({ port, config })` (mount-time init)
- Componente: `<LocaleSwitcher />` con `renderOption` prop (headless-friendly)
- Refactor: `GameTouchSpriteRuntime` ya no recibe `getPhrase` por DI — usa el hook internamente (DI sigue como override opcional para tests)

### Platform / web-demo — ~320 LOC (incluye migración)
- `apps/web-demo/app/lib/platform-web-i18n.ts`: `webI18nAdapter` (lee localStorage + navigator + SSR-safe) y helper `bindI18nPersistence`
- `apps/web-demo/demo-content/dialogs/index.ts`: convertir export crudo en `registerDemoDictionaries()`
- `apps/web-demo/app/components/InventoryUI.tsx`: montar `<LocaleSwitcher />`
- `apps/web-demo/app/lib/engine/createGameRuntime.ts` (o equivalente): llamada a `registerDemoDictionaries()` + `bindI18nPersistence()` al boot

### Docs — ~520 LOC
- `docs/phases/phase-13-i18n/README.md` (este plan)
- `docs/phases/phase-13-i18n/tracking.md`
- 12 archivos `tasks/NN-*.md`
- `docs/integrations/nextjs-i18n.md` — 3 recetas (browser, native, next-intl)
- Actualización de `docs/architecture/02-public-api.md` con nuevos exports
- Entrada en `CHANGELOG.md` para v0.4.0

---

## Estimación por sprint

| Sprint | Tareas | LOC core | LOC adapter / UI | LOC docs | Tiempo |
|--------|--------|----------|------------------|----------|--------|
| 1 — Core | 13.1 → 13.6 | ~860 | 0 | 0 | ~2.5h |
| 2 — Platform + R3F | 13.7 → 13.9 | 0 | ~590 | 0 | ~2h |
| 3 — Recetas + demo + API | 13.10 → 13.12 | 0 | ~180 | ~520 | ~1.5h |
| **TOTAL** | **12** | **~860** | **~770** | **~520** | **~6h** |
