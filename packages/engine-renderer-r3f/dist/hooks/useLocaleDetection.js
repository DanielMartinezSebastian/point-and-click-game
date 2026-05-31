"use client";
import { useEffect } from "react";
import { getI18nStore, } from "@pointclick-engine/engine-core";
/**
 * Mount-time bridge between the i18n store and a platform port. Calls
 * `bindPort(port)` once on mount and unbinds on unmount.
 */
export function useLocaleDetection({ port, config, }) {
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
//# sourceMappingURL=useLocaleDetection.js.map