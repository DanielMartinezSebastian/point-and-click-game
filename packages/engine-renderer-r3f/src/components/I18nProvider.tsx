"use client";

import { useEffect, type ReactNode } from "react";
import {
  resetI18nStore,
  type I18nConfig,
} from "@pointclick-engine/engine-core";

export interface I18nProviderProps {
  config: I18nConfig;
  children: ReactNode;
}

/**
 * Optional convenience wrapper: resets the i18n singleton with the given
 * config at mount. Most apps just call `resetI18nStore` themselves at boot,
 * but this is handy for tests and storybook stories.
 */
export function I18nProvider({ config, children }: I18nProviderProps) {
  useEffect(() => {
    resetI18nStore(config);
    // No cleanup — leaving the singleton in place is fine; consumers can call
    // resetI18nStore again to swap configs.
  }, [config]);
  return <>{children}</>;
}
