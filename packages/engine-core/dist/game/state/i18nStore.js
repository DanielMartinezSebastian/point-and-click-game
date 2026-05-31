import { DEFAULT_I18N_CONFIG, } from "../types";
let _emitter = null;
/**
 * Inject the runtime's event emitter. Mirrors `setSceneStoreEmitter`. When
 * unset (the default), the store runs in zero-event mode.
 */
export function setI18nStoreEmitter(emitter) {
    _emitter = emitter;
}
function emitGameEvent(event) {
    if (_emitter)
        _emitter(event);
}
const SHOULD_WARN = (() => {
    try {
        return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
    }
    catch {
        return false;
    }
})();
export function createI18nStore(config = DEFAULT_I18N_CONFIG) {
    let state = {
        locale: config.defaultLocale,
        availableLocales: [...config.availableLocales],
        fallbackLocale: config.fallbackLocale,
    };
    const listeners = new Set();
    const emit = () => listeners.forEach((l) => l(state));
    const update = (patch) => {
        state = { ...state, ...patch };
        emit();
    };
    const resolveSafeLocale = (next) => {
        if (state.availableLocales.includes(next))
            return next;
        const safe = state.availableLocales[0] ?? state.fallbackLocale;
        if (SHOULD_WARN && typeof console !== "undefined") {
            console.warn(`[i18nStore] locale "${next}" not in availableLocales [${state.availableLocales.join(",")}]. Falling back to "${safe}".`);
        }
        return safe;
    };
    const store = {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        setLocale(locale) {
            const safe = resolveSafeLocale(locale);
            if (safe === state.locale)
                return;
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
            if (detected)
                store.setLocale(detected);
            return store.subscribe((next) => port.persistLocale(next.locale));
        },
    };
    return store;
}
// ---------------------------------------------------------------------------
// Singleton convenience
// ---------------------------------------------------------------------------
let _singleton = null;
export function getI18nStore() {
    if (!_singleton)
        _singleton = createI18nStore(DEFAULT_I18N_CONFIG);
    return _singleton;
}
export function resetI18nStore(config = DEFAULT_I18N_CONFIG) {
    _singleton = createI18nStore(config);
}
/** Non-React helper: subscribe to the singleton store. */
export function subscribeI18n(listener) {
    return getI18nStore().subscribe(listener);
}
//# sourceMappingURL=i18nStore.js.map