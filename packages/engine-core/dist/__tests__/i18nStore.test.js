import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18nStore, getI18nStore, resetI18nStore, setI18nStoreEmitter, } from "../game/state/i18nStore";
import { HeadlessI18nAdapter } from "../ports/headlessI18n";
const TEST_CONFIG = {
    defaultLocale: "es",
    fallbackLocale: "es",
    availableLocales: ["es", "en"],
};
describe("i18nStore", () => {
    beforeEach(() => {
        resetI18nStore(TEST_CONFIG);
        setI18nStoreEmitter(null);
    });
    afterEach(() => {
        setI18nStoreEmitter(null);
    });
    it("initialises state from the provided config", () => {
        const store = createI18nStore(TEST_CONFIG);
        expect(store.getState()).toEqual({
            locale: "es",
            availableLocales: ["es", "en"],
            fallbackLocale: "es",
        });
    });
    it("setLocale updates state when locale is available", () => {
        const store = createI18nStore(TEST_CONFIG);
        store.setLocale("en");
        expect(store.getState().locale).toBe("en");
    });
    it("setLocale to the same locale does not emit listeners", () => {
        const store = createI18nStore(TEST_CONFIG);
        const listener = vi.fn();
        store.subscribe(listener);
        store.setLocale("es");
        expect(listener).not.toHaveBeenCalled();
    });
    it("setLocale falls back to the first available locale when unknown", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        const store = createI18nStore(TEST_CONFIG);
        store.setLocale("xx");
        expect(store.getState().locale).toBe("es");
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
    it("setAvailableLocales replaces the list", () => {
        const store = createI18nStore(TEST_CONFIG);
        store.setAvailableLocales(["es", "en", "fr"]);
        expect(store.getState().availableLocales).toEqual(["es", "en", "fr"]);
    });
    it("setFallbackLocale updates the fallback", () => {
        const store = createI18nStore(TEST_CONFIG);
        store.setFallbackLocale("en");
        expect(store.getState().fallbackLocale).toBe("en");
    });
    it("subscribe + unsubscribe stops notifications", () => {
        const store = createI18nStore(TEST_CONFIG);
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        store.setLocale("en");
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
        store.setLocale("es");
        expect(listener).toHaveBeenCalledTimes(1);
    });
    it("reset restores initial config and notifies", () => {
        const store = createI18nStore(TEST_CONFIG);
        store.setLocale("en");
        const listener = vi.fn();
        store.subscribe(listener);
        store.reset();
        expect(store.getState().locale).toBe("es");
        expect(listener).toHaveBeenCalled();
    });
    it("hydrate merges partial state and notifies", () => {
        const store = createI18nStore(TEST_CONFIG);
        const listener = vi.fn();
        store.subscribe(listener);
        store.hydrate({ locale: "en" });
        expect(store.getState().locale).toBe("en");
        expect(listener).toHaveBeenCalled();
    });
    it("bindPort hydrates from detectLocale and persists on change", () => {
        const port = new HeadlessI18nAdapter("en");
        const store = createI18nStore(TEST_CONFIG);
        const unsubscribe = store.bindPort(port);
        expect(store.getState().locale).toBe("en");
        store.setLocale("es");
        expect(port.calls.some((c) => c.type === "persist" && c.locale === "es")).toBe(true);
        unsubscribe();
    });
    it("bindPort returns an unsubscribe that stops persistence", () => {
        const port = new HeadlessI18nAdapter("en");
        const store = createI18nStore(TEST_CONFIG);
        const unsubscribe = store.bindPort(port);
        unsubscribe();
        port.calls.length = 0;
        store.setLocale("es");
        expect(port.calls.find((c) => c.type === "persist")).toBeUndefined();
    });
    it("setLocale emits i18n:localeChanged when an emitter is wired", () => {
        const events = [];
        setI18nStoreEmitter((e) => events.push(e));
        const store = getI18nStore();
        store.setAvailableLocales(["es", "en"]);
        store.setLocale("en");
        expect(events).toContainEqual({
            type: "i18n:localeChanged",
            locale: "en",
            previous: "es",
        });
    });
    it("singleton getI18nStore returns the same instance", () => {
        expect(getI18nStore()).toBe(getI18nStore());
    });
});
//# sourceMappingURL=i18nStore.test.js.map