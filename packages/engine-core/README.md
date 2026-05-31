# @pointclick-engine/engine-core

Framework-agnostic core for the Point & Click Game Engine. State, rules, pathfinding, i18n, ports — zero React, zero Three.js, zero browser globals.

## Install

```bash
npm install @pointclick-engine/engine-core
```

This package alone is **not** a runnable game. Pair it with a renderer:

- [@pointclick-engine/engine-renderer-r3f](https://www.npmjs.com/package/@pointclick-engine/engine-renderer-r3f) — React Three Fiber
- Or write your own (see [renderer guide](https://github.com/DanielMartinezSebastian/pointclick-engine/blob/main/docs/architecture/06-renderer-implementation-guide.md))

## Quick example

```ts
import { CommandHandler, EventBus } from "@pointclick-engine/engine-core";
import type { GameCommand, GameEvent } from "@pointclick-engine/engine-core";

const bus = new EventBus();
const commands = new CommandHandler();

commands.register("scene:set", (cmd) => {
  bus.emit("scene:changed", { type: "scene:changed", sceneId: cmd.sceneId });
});

const unsub = bus.on("scene:changed", (ev) => console.log(ev));
commands.execute({ type: "scene:set", sceneId: "town" });
// later
unsub();
```

### i18n

```ts
import {
  registerDictionary,
  translate,
  getRandomPhrase,
} from "@pointclick-engine/engine-core";

registerDictionary("en", { "greeting.hello": ["Hello!", "Hey there!"] });
registerDictionary("es", { "greeting.hello": ["¡Hola!", "¡Buenas!"] });

translate("greeting.hello", "es");      // "¡Hola!" or "¡Buenas!"
getRandomPhrase("greeting.hello", "en"); // random pick
```

## Subpath exports

Import only what you need:

```ts
import type { GameCommand }    from "@pointclick-engine/engine-core/commands";
import type { GameEvent }      from "@pointclick-engine/engine-core/events";
import type { IGameLoopPort }  from "@pointclick-engine/engine-core/ports";
import type { GameVec3 }       from "@pointclick-engine/engine-core/types";
import { useSceneStore }       from "@pointclick-engine/engine-core/state";
```

## What's inside

| Module        | Key exports |
|---------------|-------------|
| `(root)`      | Re-exports all modules below |
| `/commands`   | `CommandHandler`, `GameCommand` union |
| `/events`     | `EventBus`, `GameEvent` union |
| `/ports`      | `IGameLoopPort`, `IInputPort`, `IViewportPort`, `IAudioPort`, `I18nPort` |
| `/types`      | `GameVec3`, `GameScene`, `GameSceneWall`, `GameSceneInteraction`, `GameSceneTransition`, `PlacedSceneItem`, `ItemDefinition`, `SoundDefinition`, `SceneMusicConfig`, `AudioSettings`, `Locale`, `DialogEntry`, `I18nConfig`, `I18nState` |
| `/state`      | `useSceneStore`, `createInventorySlotsStore`, `createPlacedItemsStore`, `createAudioSettingsStore`, `createI18nStore` |
| `(root only)` | `findPath`, `inventoryRules`, `transitionRules`, `audioRules`, `registerDictionary`, `registerDictionaries`, `translate`, `getRandomPhrase`, `matchLocale`, `registerI18nExecutors` |

### Ports

Each port interface has a **headless implementation** included for testing without mocks:

| Interface | Purpose |
|-----------|---------|
| `IGameLoopPort` | Frame-tick integration (renderer drives) |
| `IInputPort` | Keyboard / pointer input |
| `IViewportPort` | Camera and viewport projection |
| `IAudioPort` | Sound playback and music |
| `I18nPort` | Locale detection and persistence |

## Design principles

- **Framework-agnostic**: no React, no Three.js, no `window`, no `document`
- **Testable without mocks**: pure functions, injectable ports, headless adapters included
- **Renderer-replaceable**: implement the port interfaces in any renderer

Full architecture: [docs/architecture/01-layers.md](https://github.com/DanielMartinezSebastian/pointclick-engine/blob/main/docs/architecture/01-layers.md)

## License

MIT © Daniel Martínez Sebastián

## Status

`v0.4.0` — active development. Core API is stabilising; i18n system added in v0.4.
