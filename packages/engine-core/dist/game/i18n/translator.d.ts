import type { DialogKey, Locale } from "../types";
export interface TranslateOptions {
    vars?: Record<string, string | number>;
    /** Override of the locale read from the store (e.g. for SSR). */
    locale?: Locale;
}
export interface GetRandomPhraseOptions {
    vars?: Record<string, string | number>;
    locale?: Locale;
    /** Injectable RNG for deterministic tests. Default: `Math.random`. */
    random?: () => number;
}
/**
 * Translate a key against the active locale, falling back to
 * `fallbackLocale` and finally the raw key when missing.
 *
 * Supports `{{var}}` interpolation via `opts.vars`.
 */
export declare function translate(key: DialogKey, opts?: TranslateOptions): string;
/**
 * Pick a random phrase for `key`. Same fallback chain as {@link translate}.
 *
 * Pass `random` to make the choice deterministic in tests.
 */
export declare function getRandomPhrase(key: DialogKey, opts?: GetRandomPhraseOptions): string;
/**
 * Best-effort BCP-47 negotiation.
 *
 * 1. exact match in `available` → return it
 * 2. primary subtag match (e.g. "es-MX" → "es") → return it
 * 3. otherwise → `null`
 */
export declare function matchLocale(candidate: string, available: Locale[]): Locale | null;
//# sourceMappingURL=translator.d.ts.map