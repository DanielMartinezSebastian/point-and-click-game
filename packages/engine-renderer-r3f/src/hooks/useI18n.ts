"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getI18nStore,
  getRandomPhrase as engineGetRandomPhrase,
  translate as engineTranslate,
  type GetRandomPhraseOptions,
  type Locale,
  type TranslateOptions,
} from "@pointclick-engine/engine-core";

export interface UseI18nResult {
  /** Currently active locale. Re-renders the consumer when it changes. */
  locale: Locale;
  /** All locales the user may switch to. */
  availableLocales: Locale[];
  /** Mutate the active locale. Calls validate against `availableLocales`. */
  setLocale: (locale: Locale) => void;
  /** Translate a key with optional `{{var}}` interpolation. */
  t: (key: string, opts?: TranslateOptions) => string;
  /**
   * Pick a random phrase for `key`. Same fallback chain as `t`. Accepts an
   * `opts.random` callback for deterministic tests.
   */
  getPhrase: (key: string, opts?: GetRandomPhraseOptions) => string;
}

/**
 * React-friendly view of the engine's i18n store. Subscribes once and
 * triggers a re-render when the locale changes.
 */
export function useI18n(): UseI18nResult {
  const store = getI18nStore();
  const [state, setState] = useState(store.getState());

  useEffect(() => store.subscribe(setState), [store]);

  const setLocale = useCallback(
    (locale: Locale) => store.setLocale(locale),
    [store],
  );

  const t = useCallback(
    (key: string, opts?: TranslateOptions) => engineTranslate(key, opts),
    [],
  );

  const getPhrase = useCallback(
    (key: string, opts?: GetRandomPhraseOptions) =>
      engineGetRandomPhrase(key, opts),
    [],
  );

  return {
    locale: state.locale,
    availableLocales: state.availableLocales,
    setLocale,
    t,
    getPhrase,
  };
}
