import { getRandomPhrase as engineGetRandomPhrase } from "@pointclick-engine/engine-core";

import { registerDemoDictionaries } from "./index";
import type { DialogKey, Locale } from "./types";

/**
 * Backward-compatible wrapper around the engine's i18n translator.
 *
 * Old callsites passed `locale` explicitly and the function fell back to
 * "es". With i18n in place, the locale lives in the engine store; pass an
 * override only when you need to bypass the active locale (e.g. SSR).
 */
export function getRandomPhrase(key: DialogKey, locale?: Locale): string {
  registerDemoDictionaries();
  return engineGetRandomPhrase(key, locale ? { locale } : undefined);
}
