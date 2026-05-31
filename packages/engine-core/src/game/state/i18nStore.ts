import {
  DEFAULT_I18N_CONFIG,
  type I18nConfig,
  type I18nState,
  type Locale,
} from "../types";
import type { GameEvent } from "../events/types";
import type { I18nPort } from "../../ports/i18n";

type Listener = (state: I18nState) => void;
type StoreEmitter = (event: GameEvent) => void;

let _emitter: StoreEmitter | null = null;

/**
 * Inject the runtime's event emitter. Mirrors `setSceneStoreEmitter`. When
 * unset (the default), the store runs in zero-event mode.
 */
export function setI18nStoreEmitter(emitter: StoreEmitter | null): void {
  _emitter = emitter;
}

function emitGameEvent(event: GameEvent): void {
  if (_emitter) _emitter(event);
}

export interface I18nStore {
  getState(): I18nState;
  subscribe(listener: Listener): () => void;
  setLocale(locale: Locale): void;
  setAvailableLocales(locales: Locale[]): void;
  setFallbackLocale(locale: Locale): void;
  hydrate(state: Partial<I18nState>): void;
  reset(): void;
  /**
   * Connect the store to an {@link I18nPort}: hydrate `locale` from
   * `port.detectLocale()` once, then persist every subsequent change via
   * `port.persistLocale`. Returns an unsubscribe function.
   */
  bindPort(port: I18nPort): () => void;
}

const SHOULD_WARN = (() => {
  try {
    return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

export function createI18nStore(
  config: I18nConfig = DEFAULT_I18N_CONFIG,
): I18nStore {
  let state: I18nState = {
    locale: config.defaultLocale,
    availableLocales: [...config.availableLocales],
    fallbackLocale: config.fallbackLocale,
  };

  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l(state));

  const update = (patch: Partial<I18nState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const resolveSafeLocale = (next: Locale): Locale => {
    if (state.availableLocales.includes(next)) return next;
    const safe = state.availableLocales[0] ?? state.fallbackLocale;
    if (SHOULD_WARN && typeof console !== "undefined") {
      console.warn(
        `[i18nStore] locale "${next}" not in availableLocales [${state.availableLocales.join(",")}]. Falling back to "${safe}".`,
      );
    }
    return safe;
  };

  const store: I18nStore = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setLocale(locale) {
      const safe = resolveSafeLocale(locale);
      if (safe === state.locale) return;
      const previous = state.locale;
      update({ locale: safe });
      emitGameEvent({ type: "i18n:localeChanged", locale: safe, previous });
    },
    setAvailableLocales(locales) {
      update({ availableLocales: [...locales] });
    },
    setFallbackLocale(locale) {
      update({ fallbackLocale: locale });
    },
    hydrate(patch) {
      state = { ...state, ...patch };
      emit();
    },
    reset() {
      state = {
        locale: config.defaultLocale,
        availableLocales: [...config.availableLocales],
        fallbackLocale: config.fallbackLocale,
      };
      emit();
    },
    bindPort(port) {
      const detected = port.detectLocale();
      if (detected) store.setLocale(detected);
      return store.subscribe((next) => port.persistLocale(next.locale));
    },
  };

  return store;
}

// ---------------------------------------------------------------------------
// Singleton convenience
// ---------------------------------------------------------------------------

let _singleton: I18nStore | null = null;

export function getI18nStore(): I18nStore {
  if (!_singleton) _singleton = createI18nStore(DEFAULT_I18N_CONFIG);
  return _singleton;
}

export function resetI18nStore(config: I18nConfig = DEFAULT_I18N_CONFIG): void {
  _singleton = createI18nStore(config);
}

/** Non-React helper: subscribe to the singleton store. */
export function subscribeI18n(listener: Listener): () => void {
  return getI18nStore().subscribe(listener);
}
