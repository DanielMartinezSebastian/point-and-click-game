"use client";

import { useEffect } from "react";
import {
  getI18nStore,
  type I18nConfig,
  type I18nPort,
} from "@pointclick-engine/engine-core";

export interface UseLocaleDetectionOptions {
  /** Platform adapter used for `detectLocale` and `persistLocale`. */
  port: I18nPort;
  /**
   * Partial overrides applied to the store before the port runs. Use it to
   * widen `availableLocales` or change the fallback at mount time.
   */
  config?: Partial<I18nConfig>;
}

/**
 * Mount-time bridge between the i18n store and a platform port. Calls
 * `bindPort(port)` once on mount and unbinds on unmount.
 */
export function useLocaleDetection({
  port,
  config,
}: UseLocaleDetectionOptions): void {
  useEffect(() => {
    const store = getI18nStore();
    if (config?.availableLocales) {
      store.setAvailableLocales(config.availableLocales);
    }
    if (config?.fallbackLocale) {
      store.setFallbackLocale(config.fallbackLocale);
    }
    return store.bindPort(port);
    // We intentionally re-run when the port instance changes so consumers can
    // hot-swap adapters in tests.
  }, [port, config?.availableLocales, config?.fallbackLocale]);
}
