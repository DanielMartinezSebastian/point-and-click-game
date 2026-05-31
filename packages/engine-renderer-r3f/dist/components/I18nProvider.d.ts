import { type ReactNode } from "react";
import { type I18nConfig } from "@pointclick-engine/engine-core";
export interface I18nProviderProps {
    config: I18nConfig;
    children: ReactNode;
}
/**
 * Optional convenience wrapper: resets the i18n singleton with the given
 * config at mount. Most apps just call `resetI18nStore` themselves at boot,
 * but this is handy for tests and storybook stories.
 */
export declare function I18nProvider({ config, children }: I18nProviderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=I18nProvider.d.ts.map