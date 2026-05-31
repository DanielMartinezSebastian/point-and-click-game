import { describe, it, expect } from "vitest";
import {
  resolveAudioEvents,
  clickSfxEvent,
  type AudioRulesContext,
  type AudioDefaultsConfig,
} from "../game/logic/rules/audioRules";
import type { GameScene, ItemDefinition } from "../game/types";
import type { GameEvent } from "../game/events";

const mockScene = (overrides?: Partial<GameScene>): GameScene => ({
  id: "test",
  label: "Test",
  background: "",
  playerSpawn: [0, 0, 0],
  ground: { minX: 0, maxX: 10, minZ: 0, maxZ: 10, y: 0 },
  walls: [],
  interactions: [],
  ...overrides,
});

describe("audioRules", () => {
  const defaults: AudioDefaultsConfig = {
    clickSoundUrl: "/sounds/click.ogg",
    pickupSoundUrl: "/sounds/pickup.ogg",
    dropSoundUrl: "/sounds/drop.ogg",
    transitionSoundUrl: "/sounds/transition.ogg",
    dialogSoundUrl: "/sounds/dialog.ogg",
  };

  describe("resolveAudioEvents", () => {
    it("emits audio:musicRequested for scene:changed with music", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {},
        transitions: {},
        currentScene: mockScene({
          music: { trackUrl: "/music/town.mp3", fadeMs: 500, volume: 0.8 },
        }),
      };
      const event: GameEvent = {
        type: "scene:changed",
        sceneId: "town",
        scene: ctx.currentScene,
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("audio:musicRequested");
      const musicEvent = result[0] as any;
      expect(musicEvent.trackUrl).toBe("/music/town.mp3");
      expect(musicEvent.fadeMs).toBe(500);
    });

    it("emits audio:musicStopped when switching from non-persistent to no music", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {},
        transitions: {},
        currentScene: mockScene(),
        previousMusic: { trackUrl: "/music/old.mp3", persistAcrossScenes: false },
      };
      const event: GameEvent = {
        type: "scene:changed",
        sceneId: "new",
        scene: ctx.currentScene,
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("audio:musicStopped");
    });

    it("does not emit stop when switching from persistent music to no music", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {},
        transitions: {},
        currentScene: mockScene(),
        previousMusic: { trackUrl: "/music/old.mp3", persistAcrossScenes: true },
      };
      const event: GameEvent = {
        type: "scene:changed",
        sceneId: "new",
        scene: ctx.currentScene,
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(0);
    });

    it("item:pickedUp with pickupSoundUrl override uses override", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {
          sword: {
            id: "sword",
            name: "Sword",
            spriteUrl: "",
            interactionRules: {},
            defaultRule: { outcome: "place" },
            pickupSoundUrl: "/sounds/sword-pickup.ogg",
          },
        },
        transitions: {},
      };
      const event: GameEvent = {
        type: "item:pickedUp",
        itemId: "sword",
        quantity: 1,
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      const sfxEvent = result[0] as any;
      expect(sfxEvent.soundUrl).toBe("/sounds/sword-pickup.ogg");
    });

    it("item:pickedUp without override uses default", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {
          coin: {
            id: "coin",
            name: "Coin",
            spriteUrl: "",
            interactionRules: {},
            defaultRule: { outcome: "place" },
          },
        },
        transitions: {},
      };
      const event: GameEvent = {
        type: "item:pickedUp",
        itemId: "coin",
        quantity: 1,
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      const sfxEvent = result[0] as any;
      expect(sfxEvent.soundUrl).toBe("/sounds/pickup.ogg");
    });

    it("item:pickedUp with no override and no default emits empty", () => {
      const ctx: AudioRulesContext = {
        defaults: {}, // no default
        items: { coin: { id: "coin", name: "Coin", spriteUrl: "", interactionRules: {}, defaultRule: { outcome: "place" } } },
        transitions: {},
      };
      const event: GameEvent = {
        type: "item:pickedUp",
        itemId: "coin",
        quantity: 1,
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(0);
    });

    it("item:dropped uses override > default > silence", () => {
      const ctx: AudioRulesContext = {
        defaults: { dropSoundUrl: "/sounds/drop.ogg" },
        items: {
          item1: {
            id: "item1",
            name: "Item",
            spriteUrl: "",
            interactionRules: {},
            defaultRule: { outcome: "place" },
            dropSoundUrl: "/sounds/custom-drop.ogg",
          },
        },
        transitions: {},
      };
      const event: GameEvent = {
        type: "item:dropped",
        itemId: "item1",
        outcome: "place",
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      const sfxEvent = result[0] as any;
      expect(sfxEvent.soundUrl).toBe("/sounds/custom-drop.ogg");
    });

    it("transition:triggered with override uses override", () => {
      const ctx: AudioRulesContext = {
        defaults: { transitionSoundUrl: "/sounds/door-default.ogg" },
        items: {},
        transitions: {
          door1: {
            kind: "collision",
            id: "door1",
            targetSceneId: "next",
            position: [0, 0, 0],
            halfSize: [1, 2, 0.5],
            triggerSoundUrl: "/sounds/door-custom.ogg",
          },
        },
      };
      const event: GameEvent = {
        type: "transition:triggered",
        transitionId: "door1",
        targetSceneId: "next",
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      const sfxEvent = result[0] as any;
      expect(sfxEvent.soundUrl).toBe("/sounds/door-custom.ogg");
    });

    it("transition:triggered without override uses default", () => {
      const ctx: AudioRulesContext = {
        defaults: { transitionSoundUrl: "/sounds/door.ogg" },
        items: {},
        transitions: {
          door1: {
            kind: "collision",
            id: "door1",
            targetSceneId: "next",
            position: [0, 0, 0],
            halfSize: [1, 2, 0.5],
          },
        },
      };
      const event: GameEvent = {
        type: "transition:triggered",
        transitionId: "door1",
        targetSceneId: "next",
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      const sfxEvent = result[0] as any;
      expect(sfxEvent.soundUrl).toBe("/sounds/door.ogg");
    });

    it("dialog:triggered with default emits category: 'ui'", () => {
      const ctx: AudioRulesContext = {
        defaults: { dialogSoundUrl: "/sounds/dialog.ogg" },
        items: {},
        transitions: {},
      };
      const event: GameEvent = {
        type: "dialog:triggered",
        text: "Hello",
        dialogKey: "greeting",
        source: "npc",
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(1);
      const sfxEvent = result[0] as any;
      expect(sfxEvent.category).toBe("ui");
    });

    it("irrelevant events return empty array", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {},
        transitions: {},
      };
      const event: GameEvent = {
        type: "player:moved",
        position: [0, 0, 0],
        action: "idle",
      };
      const result = resolveAudioEvents(event, ctx);
      expect(result.length).toBe(0);
    });

    it("fadeMs is propagated from SceneMusicConfig", () => {
      const ctx: AudioRulesContext = {
        defaults,
        items: {},
        transitions: {},
        currentScene: mockScene({
          music: { trackUrl: "/music/town.mp3", fadeMs: 1200 },
        }),
      };
      const event: GameEvent = {
        type: "scene:changed",
        sceneId: "town",
        scene: ctx.currentScene,
      };
      const result = resolveAudioEvents(event, ctx);
      const musicEvent = result[0] as any;
      expect(musicEvent.fadeMs).toBe(1200);
    });
  });

  describe("clickSfxEvent", () => {
    it("returns event with override url", () => {
      const result = clickSfxEvent(defaults, "/sounds/custom-click.ogg");
      expect(result).not.toBeNull();
      expect((result as any).soundUrl).toBe("/sounds/custom-click.ogg");
    });

    it("returns event with default url when override is undefined", () => {
      const result = clickSfxEvent(defaults);
      expect(result).not.toBeNull();
      expect((result as any).soundUrl).toBe("/sounds/click.ogg");
    });

    it("returns null when no url available", () => {
      const result = clickSfxEvent({});
      expect(result).toBeNull();
    });
  });
});
