import { getI18nStore } from "../state/i18nStore";
import { getDictionary } from "./registry";
const INTERP_RE = /\{\{(\w+)\}\}/g;
function interpolate(template, vars) {
    if (!vars)
        return template;
    return template.replace(INTERP_RE, (_match, name) => {
        const v = vars[name];
        return v !== undefined ? String(v) : `{{${name}}}`;
    });
}
function lookupFirstPhrase(key, locale) {
    const dict = getDictionary(locale);
    const entry = dict?.[key];
    if (!entry || entry.phrases.length === 0)
        return undefined;
    return entry.phrases[0];
}
/**
 * Translate a key against the active locale, falling back to
 * `fallbackLocale` and finally the raw key when missing.
 *
 * Supports `{{var}}` interpolation via `opts.vars`.
 */
export function translate(key, opts = {}) {
    const { locale, fallbackLocale } = getI18nStore().getState();
    const active = opts.locale ?? locale;
    const raw = lookupFirstPhrase(key, active) ??
        (active !== fallbackLocale ? lookupFirstPhrase(key, fallbackLocale) : undefined) ??
        key;
    return interpolate(raw, opts.vars);
}
/**
 * Pick a random phrase for `key`. Same fallback chain as {@link translate}.
 *
 * Pass `random` to make the choice deterministic in tests.
 */
export function getRandomPhrase(key, opts = {}) {
    const { locale, fallbackLocale } = getI18nStore().getState();
    const active = opts.locale ?? locale;
    const rng = opts.random ?? Math.random;
    const dict = getDictionary(active) ??
        (active !== fallbackLocale ? getDictionary(fallbackLocale) : undefined);
    const entry = dict?.[key];
    // Try fallback when active dict exists but lacks the key.
    const finalEntry = entry ??
        (active !== fallbackLocale
            ? getDictionary(fallbackLocale)?.[key]
            : undefined);
    if (!finalEntry || finalEntry.phrases.length === 0)
        return key;
    const idx = Math.floor(rng() * finalEntry.phrases.length);
    const phrase = finalEntry.phrases[idx] ?? finalEntry.phrases[0];
    return interpolate(phrase, opts.vars);
}
/**
 * Best-effort BCP-47 negotiation.
 *
 * 1. exact match in `available` → return it
 * 2. primary subtag match (e.g. "es-MX" → "es") → return it
 * 3. otherwise → `null`
 */
export function matchLocale(candidate, available) {
    if (!candidate)
        return null;
    if (available.includes(candidate))
        return candidate;
    const primary = candidate.split("-")[0];
    if (available.includes(primary))
        return primary;
    return null;
}
//# sourceMappingURL=translator.js.map