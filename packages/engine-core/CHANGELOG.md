# Changelog

All notable changes to `@pointclick-engine/engine-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] — 2026-05-31

### Added — i18n / Localization System (Phase 13)

- Core types: `Locale` (BCP-47 string), `DialogEntry`, `DialogDictionary`,
  `LocaleDictionaries`, `I18nConfig`, `I18nState`, `DEFAULT_I18N_CONFIG`.
- New port `I18nPort` (`detectLocale` / `persistLocale` / `clearLocale?`)
  with `HeadlessI18nAdapter` for tests and SSR.
- `i18nStore` with `createI18nStore`, `getI18nStore`, `resetI18nStore`,
  `subscribeI18n`, `setI18nStoreEmitter`, and `bindPort(port)` for one-line
  detect + persist wiring.
- Dictionary registry: `registerDictionary`, `registerDictionaries`,
  `getDictionary`, `clearRegistry`, `getRegisteredLocales`. Incremental
  merge with collision warning.
- Translator: `translate(key, { vars, locale })`, `getRandomPhrase(key,
  { vars, locale, random })` with active → fallback → key fallback chain
  and `{{var}}` interpolation. `matchLocale(candidate, available)` BCP-47
  negotiation.
- Commands: `i18n:setLocale`, `i18n:registerDictionary`.
- Events: `i18n:localeChanged`, `i18n:dictionaryUpdated`.
- `registerI18nExecutors(handler, emit?)` wires both commands against a
  `CommandHandler`.
- 48 new tests (store / registry / translator / headless adapter / executors).

### Changed

- `Locale` is now `string` (BCP-47) instead of a fixed union. The demo
  keeps a narrowed `DemoLocale = "es" | "en"` alias for authoring.

### Backward compatibility

- Pure additions — no breaking changes. Existing consumers continue to work.

## [0.1.0] — 2026-05-27

### Added

- Initial release.
- Framework-agnostic core: no React, no Three.js, no browser globals.
- **State**: `useSceneStore` (Zustand) — scene, player position, interactions, respawn.
- **Types**: `GameVec3`, `GameScene`, `GameSceneWall`, `GameSceneInteraction`, `GameSceneGround`.
- **Commands**: `CommandHandler`, `GameCommand` union (`scene:set`, `scene:respawn`, `player:stop`, `inventory:toggle`, `inventory:pickup`, `inventory:drop`, `dialog:trigger`, `dialog:dismiss`).
- **Events**: `EventBus`, `GameEvent` union (`scene:changed`, `player:moved`, `dialog:triggered`, `dialog:dismissed`).
- **Ports**: `IGameLoopPort`, `IInputPort`, `IViewportPort` — agnostic renderer interfaces.
- **Logic**: `findPath` grid-based pathfinding, inventory interaction rules.
- **Subpath exports**: `/commands`, `/events`, `/ports`, `/types`, `/state`.

### Notes

- API subject to change in v0.2+.
- Commands `player:stop`, `inventory:pickup`, `inventory:drop` are registered but executors are deferred to v0.2.0 (require renderer-side integration).
