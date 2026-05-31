"use client";
import { useCallback, useEffect, useState } from "react";
import { getI18nStore, getRandomPhrase as engineGetRandomPhrase, translate as engineTranslate, } from "@pointclick-engine/engine-core";
/**
 * React-friendly view of the engine's i18n store. Subscribes once and
 * triggers a re-render when the locale changes.
 */
export function useI18n() {
    const store = getI18nStore();
    const [state, setState] = useState(store.getState());
    useEffect(() => store.subscribe(setState), [store]);
    const setLocale = useCallback((locale) => store.setLocale(locale), [store]);
    const t = useCallback((key, opts) => engineTranslate(key, opts), []);
    const getPhrase = useCallback((key, opts) => engineGetRandomPhrase(key, opts), []);
    return {
        locale: state.locale,
        availableLocales: state.availableLocales,
        setLocale,
        t,
        getPhrase,
    };
}
//# sourceMappingURL=useI18n.js.map