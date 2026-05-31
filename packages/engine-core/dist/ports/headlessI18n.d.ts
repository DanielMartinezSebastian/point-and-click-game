import type { Locale } from "../game/types";
import type { I18nPort } from "./i18n";
export type HeadlessI18nCall = {
    type: "detect";
} | {
    type: "persist";
    locale: Locale;
} | {
    type: "clear";
};
/**
 * Test / SSR-friendly implementation of {@link I18nPort}. Records every call
 * and stores the persisted locale in memory.
 */
export declare class HeadlessI18nAdapter implements I18nPort {
    readonly calls: HeadlessI18nCall[];
    private stored;
    constructor(initial?: Locale | null);
    detectLocale(): Locale | null;
    persistLocale(locale: Locale): void;
    clearLocale(): void;
    /** Reset call log and stored value. */
    reset(initial?: Locale | null): void;
}
//# sourceMappingURL=headlessI18n.d.ts.map