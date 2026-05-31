"use client";
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { resetI18nStore, } from "@pointclick-engine/engine-core";
/**
 * Optional convenience wrapper: resets the i18n singleton with the given
 * config at mount. Most apps just call `resetI18nStore` themselves at boot,
 * but this is handy for tests and storybook stories.
 */
export function I18nProvider({ config, children }) {
    useEffect(() => {
        resetI18nStore(config);
        // No cleanup — leaving the singleton in place is fine; consumers can call
        // resetI18nStore again to swap configs.
    }, [config]);
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=I18nProvider.js.map