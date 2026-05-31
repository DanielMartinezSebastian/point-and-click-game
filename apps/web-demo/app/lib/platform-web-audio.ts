import type {
  AudioMuteTarget,
  AudioMusicOptions,
  AudioPlayOptions,
  AudioPort,
  SoundDefinition,
  SoundCategory,
} from "@pointclick-engine/engine-core";

const POOL_SIZE = 4;
const DEFAULT_FADE_MS = 800;
const FADE_STEP_MS = 50;

interface MuteState {
  master: boolean;
  music: boolean;
  sfx: boolean;
}

interface VolumeState {
  master: number;
  music: number;
  sfx: number;
}

export class WebAudioAdapter implements AudioPort {
  private readonly isBrowser = typeof window !== "undefined";
  private readonly sfxPool = new Map<string, HTMLAudioElement[]>();
  private musicEl: HTMLAudioElement | null = null;
  private musicUrl: string | undefined;
  private mute: MuteState = { master: false, music: false, sfx: false };
  private vol: VolumeState = { master: 0.8, music: 0.6, sfx: 0.8 };
  private pendingPlay: Array<() => void> = [];
  private unlocked = false;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (this.isBrowser) {
      const unlock = () => {
        this.unlocked = true;
        this.pendingPlay.forEach((fn) => fn());
        this.pendingPlay = [];
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
  }

  private getOrCreateAudioElement(url: string): HTMLAudioElement {
    let pool = this.sfxPool.get(url);
    if (!pool) {
      pool = [];
      this.sfxPool.set(url, pool);
    }

    // Find a free element
    for (const el of pool) {
      if (el.paused || el.ended) {
        return el;
      }
    }

    // Create new if under pool size
    if (pool.length < POOL_SIZE) {
      const el = new Audio(url);
      el.preload = "auto";
      pool.push(el);
      return el;
    }

    // Return first (will cut off)
    return pool[0];
  }

  private isCategoryMuted(category: SoundCategory): boolean {
    if (this.mute.master) return true;
    if (category === "music" && this.mute.music) return true;
    if (
      (category === "sfx" || category === "ui" || category === "ambient") &&
      this.mute.sfx
    )
      return true;
    return false;
  }

  private effectiveVolume(category: SoundCategory): number {
    if (this.isCategoryMuted(category)) return 0;
    const baseVol =
      category === "music" ? this.vol.music : this.vol.sfx;
    return baseVol * this.vol.master;
  }

  private tryPlay(fn: () => void): void {
    if (!this.unlocked) {
      this.pendingPlay.push(fn);
      return;
    }
    fn();
  }

  playSound(def: SoundDefinition, opts?: AudioPlayOptions): void {
    if (!this.isBrowser) return;
    // Mute always wins over an explicit per-play volume override.
    if (this.isCategoryMuted(def.category)) return;

    const el = this.getOrCreateAudioElement(def.url);
    el.currentTime = 0;
    el.volume =
      opts?.volume !== undefined
        ? Math.max(0, Math.min(1, opts.volume * this.vol.master))
        : this.effectiveVolume(def.category);

    this.tryPlay(() => {
      el.play().catch(() => {
        // Autoplay blocked, will retry on user interaction
      });
    });
  }

  playMusic(def: SoundDefinition, opts?: AudioMusicOptions): void {
    if (!this.isBrowser) return;

    // If same URL, don't restart
    if (this.musicUrl === def.url) return;

    const newEl = new Audio(def.url);
    newEl.loop = true;
    newEl.volume = opts?.volume ?? this.effectiveVolume("music");
    newEl.preload = "auto";

    this.tryPlay(() => {
      newEl.play().catch(() => {
        // Autoplay blocked
      });
    });

    // Crossfade if there was previous music
    if (this.musicEl && this.musicUrl !== def.url) {
      const fadeMs = opts?.fadeMs ?? DEFAULT_FADE_MS;
      this.crossfade(this.musicEl, newEl, fadeMs);
    } else {
      if (this.musicEl) this.musicEl.pause();
      this.musicEl = newEl;
      this.musicUrl = def.url;
    }
  }

  private crossfade(
    oldEl: HTMLAudioElement,
    newEl: HTMLAudioElement,
    fadeMs: number
  ): void {
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    const steps = Math.ceil(fadeMs / FADE_STEP_MS);
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      oldEl.volume = (1 - progress) * (this.effectiveVolume("music") || oldEl.volume);
      newEl.volume = progress * this.effectiveVolume("music");

      if (progress >= 1) {
        clearInterval(this.fadeInterval!);
        this.fadeInterval = null;
        oldEl.pause();
        this.musicEl = newEl;
        this.musicUrl = newEl.src;
      }
    }, FADE_STEP_MS);
  }

  stopMusic(opts?: AudioMusicOptions): void {
    if (!this.isBrowser || !this.musicEl) return;

    const fadeMs = opts?.fadeMs ?? DEFAULT_FADE_MS;
    const steps = Math.ceil(fadeMs / FADE_STEP_MS);
    let step = 0;
    const startVol = this.musicEl.volume;

    if (this.fadeInterval) clearInterval(this.fadeInterval);

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      if (this.musicEl) {
        this.musicEl.volume = startVol * (1 - progress);
      }

      if (progress >= 1) {
        clearInterval(this.fadeInterval!);
        this.fadeInterval = null;
        if (this.musicEl) {
          this.musicEl.pause();
          this.musicEl = null;
          this.musicUrl = undefined;
        }
      }
    }, FADE_STEP_MS);
  }

  setMuted(target: AudioMuteTarget, muted: boolean): void {
    if (!this.isBrowser) return;

    if (target === "master") {
      this.mute.master = muted;
    } else if (target === "music") {
      this.mute.music = muted;
    } else {
      this.mute.sfx = muted;
    }

    // Update music volume if muted
    if (target === "master" || target === "music") {
      if (this.musicEl) {
        this.musicEl.volume = this.effectiveVolume("music");
      }
    }
  }

  setVolume(target: AudioMuteTarget, volume: number): void {
    if (!this.isBrowser) return;

    const v = Math.max(0, Math.min(1, volume));

    if (target === "master") {
      this.vol.master = v;
    } else if (target === "music") {
      this.vol.music = v;
    } else {
      this.vol.sfx = v;
    }

    // Update music volume
    if ((target === "master" || target === "music") && this.musicEl) {
      this.musicEl.volume = this.effectiveVolume("music");
    }
  }

  async preload(urls: string[]): Promise<void> {
    if (!this.isBrowser) return;

    await Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const audio = new Audio(url);
            audio.preload = "auto";
            const onReady = () => {
              audio.removeEventListener("canplaythrough", onReady);
              resolve();
            };
            audio.addEventListener("canplaythrough", onReady, { once: true });
            const timeout = setTimeout(() => {
              audio.removeEventListener("canplaythrough", onReady);
              resolve();
            }, 5000);
            audio.load();
          })
      )
    );
  }

  dispose(): void {
    if (!this.isBrowser) return;

    if (this.fadeInterval) clearInterval(this.fadeInterval);

    if (this.musicEl) {
      this.musicEl.pause();
      this.musicEl = null;
    }

    for (const pool of this.sfxPool.values()) {
      for (const el of pool) {
        el.pause();
      }
    }
    this.sfxPool.clear();

    this.pendingPlay = [];
  }
}

export const webAudioAdapter = new WebAudioAdapter();

// Persistence helper
import {
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettingsStore,
} from "@pointclick-engine/engine-core";
import { localStorageAdapter } from "./platform-web";

export function bindAudioPersistence(store: AudioSettingsStore): () => void {
  const persisted = loadAudioSettings(localStorageAdapter);
  if (persisted) store.hydrate(persisted);

  let timeout: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = store.subscribe((settings) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(
      () => saveAudioSettings(localStorageAdapter, settings),
      250
    );
  });

  return () => {
    if (timeout) clearTimeout(timeout);
    unsubscribe();
  };
}
