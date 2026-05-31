/**
 * Test / SSR-friendly implementation of {@link I18nPort}. Records every call
 * and stores the persisted locale in memory.
 */
export class HeadlessI18nAdapter {
    constructor(initial = null) {
        this.calls = [];
        this.stored = initial;
    }
    detectLocale() {
        this.calls.push({ type: "detect" });
        return this.stored;
    }
    persistLocale(locale) {
        this.calls.push({ type: "persist", locale });
        this.stored = locale;
    }
    clearLocale() {
        this.calls.push({ type: "clear" });
        this.stored = null;
    }
    /** Reset call log and stored value. */
    reset(initial = null) {
        this.calls.length = 0;
        this.stored = initial;
    }
}
//# sourceMappingURL=headlessI18n.js.map