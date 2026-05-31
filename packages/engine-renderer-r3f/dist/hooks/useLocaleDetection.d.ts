import { type I18nConfig, type I18nPort } from "@pointclick-engine/engine-core";
export interface UseLocaleDetectionOptions {
    /** Platform adapter used for `detectLocale` and `persistLocale`. */
    port: I18nPort;
    /**
     * Partial overrides applied to the store before the port runs. Use it to
     * widen `availableLocales` or change the fallback at mount time.
     */
    config?: Partial<I18nConfig>;
}
/**
 * Mount-time bridge between the i18n store and a platform port. Calls
 * `bindPort(port)` once on mount and unbinds on unmount.
 */
export declare function useLocaleDetection({ port, config, }: UseLocaleDetectionOptions): void;
//# sourceMappingURL=useLocaleDetection.d.ts.map