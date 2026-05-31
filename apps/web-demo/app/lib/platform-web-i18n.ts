/**
 * platform-web-i18n — Web adapter for the engine's I18nPort.
 *
 * Reads `localStorage` for the user's persisted choice and falls back to
 * `navigator.language` matched against the registered locales. SSR-safe: all
 * operations are no-ops when `typeof window === "undefined"`.
 */

import type {
  I18nPort,
  I18nStore,
  Locale,
} from "@pointclick-engine/engine-core";

/**
 * Tiny inline copy of the engine's `matchLocale` so the adapter doesn't take
 * a runtime dependency on the symbol being available in older builds. Kept
 * in sync with `packages/engine-core/src/game/i18n/translator.ts`.
 */
function matchLocale(candidate: string, available: Locale[]): Locale | null {
  if (!candidate) return null;
  if (available.includes(candidate)) return candidate;
  const primary = candidate.split("-")[0]!;
  if (available.includes(primary)) return primary;
  return null;
}

export const DEFAULT_I18N_STORAGE_KEY = "i18n-locale";

export interface WebI18nAdapterOptions {
  /** Whitelist of locales the engine accepts. */
  availableLocales: Locale[];
  /** localStorage key. Defaults to `"i18n-locale"`. */
  storageKey?: string;
}

export class WebI18nAdapter implements I18nPort {
  private readonly availableLocales: Locale[];
  private readonly storageKey: string;

  constructor(opts: WebI18nAdapterOptions) {
    this.availableLocales = [...opts.availableLocales];
    this.storageKey = opts.storageKey ?? DEFAULT_I18N_STORAGE_KEY;
  }

  /**
   * Evaluated per-call (not cached) so adapters constructed under SSR keep
   * working once the client hydrates.
   */
  private get isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  detectLocale(): Locale | null {
    if (!this.isBrowser) return null;

    // 1) Persisted choice from a previous session.
    try {
      const persisted = window.localStorage.getItem(this.storageKey);
      if (persisted && this.availableLocales.includes(persisted)) {
        return persisted;
      }
    } catch {
      /* storage disabled / quota — fall through to navigator. */
    }

    // 2) Browser preference.
    try {
      const candidates: string[] = [];
      if (window.navigator.language) candidates.push(window.navigator.language);
      if (Array.isArray(window.navigator.languages)) {
        candidates.push(...window.navigator.languages);
      }
      for (const c of candidates) {
        const matched = matchLocale(c, this.availableLocales);
        if (matched) return matched;
      }
    } catch {
      /* ignore */
    }

    return null;
  }

  persistLocale(locale: Locale): void {
    if (!this.isBrowser) return;
    try {
      window.localStorage.setItem(this.storageKey, locale);
    } catch {
      /* storage disabled — silently ignore. */
    }
  }

  clearLocale(): void {
    if (!this.isBrowser) return;
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      /* ignore */
    }
  }
}

export function createWebI18nAdapter(
  opts: WebI18nAdapterOptions,
): WebI18nAdapter {
  return new WebI18nAdapter(opts);
}

/**
 * Convenience wrapper that calls `store.bindPort(port)` and returns the
 * unsubscribe. Provided so consumers don't need to know about the port
 * internals.
 */
export function bindI18nPersistence(
  store: I18nStore,
  port: I18nPort,
): () => void {
  return store.bindPort(port);
}
