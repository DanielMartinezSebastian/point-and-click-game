import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebAudioAdapter } from "./platform-web-audio";

interface FakeAudioInstance {
  src: string;
  preload: string;
  loop: boolean;
  volume: number;
  currentTime: number;
  paused: boolean;
  ended: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

const audioInstances: FakeAudioInstance[] = [];

function FakeAudio(this: FakeAudioInstance, url: string) {
  this.src = url;
  this.preload = "";
  this.loop = false;
  this.volume = 1;
  this.currentTime = 0;
  this.paused = true;
  this.ended = false;
  this.play = vi.fn().mockImplementation(() => {
    this.paused = false;
    return Promise.resolve();
  });
  this.pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });
  this.load = vi.fn();
  this.addEventListener = vi.fn();
  this.removeEventListener = vi.fn();
  audioInstances.push(this);
}

function unlockAdapter() {
  // The adapter queues plays until a user gesture. Simulate it.
  const handlers = (globalThis as any).__windowHandlers as Map<
    string,
    Array<EventListenerOrEventListenerObject>
  >;
  const pointerHandlers = handlers.get("pointerdown") ?? [];
  for (const h of pointerHandlers) {
    if (typeof h === "function") h(new Event("pointerdown"));
  }
}

beforeEach(() => {
  audioInstances.length = 0;
  const handlers = new Map<string, Array<EventListenerOrEventListenerObject>>();
  (globalThis as any).__windowHandlers = handlers;
  vi.stubGlobal("window", {
    addEventListener: (name: string, h: EventListenerOrEventListenerObject) => {
      const list = handlers.get(name) ?? [];
      list.push(h);
      handlers.set(name, list);
    },
    removeEventListener: (
      name: string,
      h: EventListenerOrEventListenerObject,
    ) => {
      const list = handlers.get(name) ?? [];
      handlers.set(
        name,
        list.filter((x) => x !== h),
      );
    },
  });
  vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WebAudioAdapter — mute semantics", () => {
  it("playSound does NOT play when master is muted, even with explicit volume", () => {
    const adapter = new WebAudioAdapter();
    unlockAdapter();
    adapter.setMuted("master", true);

    adapter.playSound(
      { id: "speak", url: "/speak.mp3", category: "sfx" },
      { volume: 0.35 },
    );

    expect(audioInstances).toHaveLength(0);
  });

  it("playSound does NOT play when category sfx is muted, even with explicit volume", () => {
    const adapter = new WebAudioAdapter();
    unlockAdapter();
    adapter.setMuted("sfx", true);

    adapter.playSound(
      { id: "speak", url: "/speak.mp3", category: "sfx" },
      { volume: 0.35 },
    );
    adapter.playSound(
      { id: "ui", url: "/click.mp3", category: "ui" },
      { volume: 0.5 },
    );
    adapter.playSound({
      id: "amb",
      url: "/amb.mp3",
      category: "ambient",
    });

    expect(audioInstances).toHaveLength(0);
  });

  it("playSound DOES play when sfx is muted but music is not (music category)", () => {
    const adapter = new WebAudioAdapter();
    unlockAdapter();
    adapter.setMuted("sfx", true);

    adapter.playSound({ id: "track", url: "/m.mp3", category: "music" });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].play).toHaveBeenCalled();
  });

  it("explicit per-play volume is scaled by master volume", () => {
    const adapter = new WebAudioAdapter();
    unlockAdapter();
    adapter.setVolume("master", 0.5);

    adapter.playSound(
      { id: "speak", url: "/speak.mp3", category: "sfx" },
      { volume: 0.4 },
    );

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].volume).toBeCloseTo(0.2);
  });

  it("master-mute toggling re-enables sounds after being muted", () => {
    const adapter = new WebAudioAdapter();
    unlockAdapter();
    adapter.setMuted("master", true);
    adapter.playSound({ id: "x", url: "/x.mp3", category: "sfx" });
    expect(audioInstances).toHaveLength(0);

    adapter.setMuted("master", false);
    adapter.playSound({ id: "x", url: "/x.mp3", category: "sfx" });
    expect(audioInstances).toHaveLength(1);
  });
});
