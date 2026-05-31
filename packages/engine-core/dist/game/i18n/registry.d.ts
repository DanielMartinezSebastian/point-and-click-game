import type { DialogDictionary, Locale, LocaleDictionaries } from "../types";
/**
 * Register (or extend) a dictionary for a locale. Existing keys are
 * overwritten with a warning in development; new keys are merged in.
 */
export declare function registerDictionary(locale: Locale, dict: DialogDictionary): void;
/** Register multiple locales at once. */
export declare function registerDictionaries(all: LocaleDictionaries): void;
/** Lookup the current dictionary for `locale`. */
export declare function getDictionary(locale: Locale): DialogDictionary | undefined;
/** Empty the registry. Primarily for tests / `resetI18n`. */
export declare function clearRegistry(): void;
/** Diagnostic helper — list all currently registered locales. */
export declare function getRegisteredLocales(): Locale[];
//# sourceMappingURL=registry.d.ts.map