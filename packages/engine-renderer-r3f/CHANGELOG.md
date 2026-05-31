# Changelog

All notable changes to `@pointclick-engine/engine-renderer-r3f` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] — 2026-05-31

### Added — i18n React surface (Phase 13)

- `useI18n()` → `{ locale, availableLocales, setLocale, t, getPhrase }`.
  Re-renders the consumer when the locale changes.
- `useLocaleDetection({ port, config? })`: mount-time bridge that calls
  `store.bindPort(port)` once. Accepts partial config overrides.
- `<I18nProvider config={...}>`: optional config-reset wrapper, useful
  for tests and Storybook.
- `<LocaleSwitcher />`: drop-in language picker with three modes —
  `as="buttons"` (default), `as="select"`, and `renderOption` render-prop.
  Accessible (`aria-current`, group `aria-label`).

### Changed

- `GameTouchSpriteRuntime.getPhrase` deprecated. The prop was already
  unused inside the runtime (the host resolves boundary phrases from
  `onCollide` events). Hosts should drop the DI and rely on `useI18n`
  or `getRandomPhrase` from `@pointclick-engine/engine-core`. Kept as a
  no-op for backward compat.

### Backward compatibility

- Pure additions — no breaking changes.

## [0.1.0] — 2026-05-27

### Added

- Initial release.
- **`GameViewport`**: main React component composing Canvas, physics (Rapier), and R3F runtime.
- **`createGameRuntime`**: factory that registers scenes, items, and dialog rules; returns a bidirectional handle with `executeCommand`, `on`, `emit`, and `dispose`.
- **Adapters**:
  - `useR3FGameLoop` — `IGameLoopPort` implementation using `useFrame` from `@react-three/fiber`.
  - `WebKeyboardInput` — `IInputPort` implementation for keyboard events.
- **Sprite system**: `DavidSprite` with 2.5D depth scale, directional animation clips, speaking animation.
- **Scene primitives**: `SceneGround`, `SceneWalls`, `SceneCollisionSphere`, `SceneWallPointPreview`.
- **`GameTouchSpriteRuntime`**: player click-to-move controller (mouse, touch, keyboard, joystick).
- **`SpeechBubble`**: in-world dialog display component.
- **Subpath exports**: `/adapters`, `/components`.
- Backwards-compatible `onRuntimeEvent` callback via legacy adapter.

### Notes

- Requires peer dependencies: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `zustand`.
- API subject to change in v0.2+.
