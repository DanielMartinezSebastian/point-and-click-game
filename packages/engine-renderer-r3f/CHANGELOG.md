# Changelog

All notable changes to `@pointclick-engine/engine-renderer-r3f` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] — 2026-05-31

This release folds in everything between v0.1.x and v0.4.0 (phases 6, 8, 9,
10, 11, 12, 13). Pure additions — no breaking changes for the public surface.

### Added — Wall renderer with openings (Phase 6)

- `SceneWalls` now renders true 3D wall segments with visible cuts at
  each opening; sensible default opening positions and editor support.

### Added — Scene transition renderer (Phase 8)

- `SceneTransitions` component handles collision-zone detection and
  triggers transitions via the core handlers (cached empty-transitions
  array prevents infinite loops).

### Added — Player walk animation (Phase 10)

- `usePlayerWalkAnimation` hook reacts to `player:walkTo` / walk
  events from core and drives sprite movement; input is blocked during
  the walk and animation runs on entry-position arrivals.

### Added — Audio system R3F bridge (Phase 11)

- `useAudioSystem` hook wires `GameEvent`s to an `AudioPort` adapter
  (default = web), syncs mute / volume state, and applies persisted
  settings on load.

### Changed — Architecture cleanup (Phase 12)

- Renderer no longer leaks into core; pulled debug logs; `GameCanvasCore`
  added as the headless variant for hosts that supply their own Canvas.

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
