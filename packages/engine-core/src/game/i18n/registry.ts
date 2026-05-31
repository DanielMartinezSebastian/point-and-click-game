import type {
  DialogDictionary,
  Locale,
  LocaleDictionaries,
} from "../types";

const SHOULD_WARN = (() => {
  try {
    return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

const registry = new Map<Locale, DialogDictionary>();

/**
 * Register (or extend) a dictionary for a locale. Existing keys are
 * overwritten with a warning in development; new keys are merged in.
 */
export function registerDictionary(
  locale: Locale,
  dict: DialogDictionary,
): void {
  const existing = registry.get(locale);
  if (!existing) {
    registry.set(locale, { ...dict });
    return;
  }
  if (SHOULD_WARN && typeof console !== "undefined") {
    for (const key of Object.keys(dict)) {
      if (existing[key]) {
        console.warn(
          `[i18n] overwriting key "${key}" in locale "${locale}"`,
        );
      }
    }
  }
  registry.set(locale, { ...existing, ...dict });
}

/** Register multiple locales at once. */
export function registerDictionaries(all: LocaleDictionaries): void {
  for (const locale of Object.keys(all)) {
    registerDictionary(locale, all[locale]!);
  }
}

/** Lookup the current dictionary for `locale`. */
export function getDictionary(
  locale: Locale,
): DialogDictionary | undefined {
  return registry.get(locale);
}

/** Empty the registry. Primarily for tests / `resetI18n`. */
export function clearRegistry(): void {
  registry.clear();
}

/** Diagnostic helper — list all currently registered locales. */
export function getRegisteredLocales(): Locale[] {
  return Array.from(registry.keys());
}
