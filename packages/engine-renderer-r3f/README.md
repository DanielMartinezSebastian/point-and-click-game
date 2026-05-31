# @pointclick-engine/engine-renderer-r3f

React Three Fiber renderer for the [Point & Click Game Engine](https://www.npmjs.com/package/@pointclick-engine/engine-core).

## Install

```bash
npm install @pointclick-engine/engine-renderer-r3f @pointclick-engine/engine-core
```

Peer dependencies (install in your app):

```bash
npm install react react-dom three @react-three/fiber @react-three/drei @react-three/rapier zustand
```

Supported ranges: React 18/19 · Three ≥0.150 · R3F 8/9 · Drei 9/10 · Rapier 1/2 · Zustand 4/5.

## Quick start

```tsx
import {
  GameCanvasCore,
  GameTouchSpriteRuntime,
  SceneGround,
  SceneWalls,
} from "@pointclick-engine/engine-renderer-r3f";
import { useSceneStore } from "@pointclick-engine/engine-core/state";
import type { GameScene } from "@pointclick-engine/engine-core/types";

const scene: GameScene = {
  id: "town",
  label: "Town",
  background: "/assets/background/town.jpg",
  playerSpawn: [0, 0, 10],
  ground: { minX: -15, maxX: 15, minZ: -10, maxZ: 30, y: -3 },
  walls: [],
  interactions: [],
  transitions: [],
};

// Register before first render
useSceneStore.getState().setScenes([scene]);
useSceneStore.getState().setCurrentScene("town");

function App() {
  return (
    <GameCanvasCore>
      <SceneGround />
      <SceneWalls />
      <GameTouchSpriteRuntime />
    </GameCanvasCore>
  );
}
```

## i18n / Localization

```tsx
import {
  I18nProvider,
  LocaleSwitcher,
  useI18n,
} from "@pointclick-engine/engine-renderer-r3f";
import { registerDictionary } from "@pointclick-engine/engine-core";

registerDictionary("en", { "ui.start": ["Start game"] });
registerDictionary("es", { "ui.start": ["Iniciar juego"] });

function HUD() {
  const { t, locale } = useI18n();
  return <p>{t("ui.start")}</p>;
}

function App() {
  return (
    <I18nProvider defaultLocale="en">
      <LocaleSwitcher locales={["en", "es"]} />
      <HUD />
      <GameCanvasCore>…</GameCanvasCore>
    </I18nProvider>
  );
}
```

Locale is auto-detected from `navigator.language` (via `useLocaleDetection`) and persisted through the `I18nPort`.

## Subpath exports

```ts
// Port adapters (implement engine-core interfaces for R3F / browser)
import { useR3FGameLoop, WebKeyboardInput } from "@pointclick-engine/engine-renderer-r3f/adapters";

// React components (canvas, i18n UI)
import { GameCanvasCore, I18nProvider, LocaleSwitcher } from "@pointclick-engine/engine-renderer-r3f/components";
```

Everything is also re-exported from the root entry point.

## What this package provides

### Canvas & runtime

| Export | Description |
|--------|-------------|
| `GameCanvasCore` | R3F `Canvas` shell with physics world and game loop wired up |
| `GameTouchSpriteRuntime` | Player movement controller — click-to-move, touch, keyboard |

### Scene primitives

| Export | Description |
|--------|-------------|
| `SceneGround` | Invisible ground plane with physics collider |
| `SceneWalls` | Renders `GameSceneWall[]` as collidable wall segments |
| `SceneWallPlane` | Single wall plane primitive |
| `SceneCollisionSphere` | Invisible collision sphere for interaction zones |
| `SceneWallPointPreview` | Editor helper: visualises wall boundary points |
| `SceneTransitions` | Renders scene exit/entry portals from `GameSceneTransition[]` |
| `computeWallSegments` | Pure function: converts wall points → `WallSegment[]` |

### Sprite

| Export | Description |
|--------|-------------|
| `DavidSprite` | Billboarded 2D sprite with depth-based scale and animation clips |
| `buildSpeakingAnimation` | Utility: builds lip-sync animation from a dialog entry |
| `SpeechBubble` | In-world speech bubble anchored to a 3D position |

### Hooks

| Export | Description |
|--------|-------------|
| `usePlayerWalkAnimation` | Drives walk/idle animation clips on `DavidSprite` |
| `useClickToMoveController` | Ground-click → pathfinding → movement commands |
| `useKeyboardMovementInput` | WASD / arrow-key input state |
| `useAudioSystem` | Connects `IAudioPort` to Web Audio API |
| `useI18n` | Access `t()` translator and current locale from a component |
| `useLocaleDetection` | Detects browser locale and writes it to the i18n store |

### Port adapters

| Export | Description |
|--------|-------------|
| `useR3FGameLoop` | `IGameLoopPort` implementation — delegates to R3F `useFrame` |
| `WebKeyboardInput` | `IInputPort` implementation — browser `KeyboardEvent` listener |

### i18n components

| Export | Description |
|--------|-------------|
| `I18nProvider` | Context provider that initialises the i18n store |
| `LocaleSwitcher` | Headless locale picker (bring your own styles) |

## License

MIT © Daniel Martínez Sebastián

## Status

`v0.4.0` — active development. R3F is currently the only supported renderer; the engine is renderer-agnostic by design.
