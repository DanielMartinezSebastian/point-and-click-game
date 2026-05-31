import { type GetRandomPhraseOptions, type Locale, type TranslateOptions } from "@pointclick-engine/engine-core";
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
export declare function useI18n(): UseI18nResult;
//# sourceMappingURL=useI18n.d.ts.map