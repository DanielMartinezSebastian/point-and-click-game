import { describe, expect, it } from "vitest";
import { HeadlessI18nAdapter } from "../ports/headlessI18n";
describe("HeadlessI18nAdapter", () => {
    it("starts with null when no initial value is provided", () => {
        const port = new HeadlessI18nAdapter();
        expect(port.detectLocale()).toBeNull();
        expect(port.calls[0]).toEqual({ type: "detect" });
    });
    it("returns initial value provided in constructor", () => {
        const port = new HeadlessI18nAdapter("en");
        expect(port.detectLocale()).toBe("en");
    });
    it("persistLocale stores and detect surfaces it", () => {
        const port = new HeadlessI18nAdapter();
        port.persistLocale("es");
        expect(port.detectLocale()).toBe("es");
        expect(port.calls.map((c) => c.type)).toEqual(["persist", "detect"]);
    });
    it("clearLocale wipes the stored value", () => {
        const port = new HeadlessI18nAdapter("en");
        port.clearLocale();
        expect(port.detectLocale()).toBeNull();
        expect(port.calls.some((c) => c.type === "clear")).toBe(true);
    });
    it("reset clears calls and stored value", () => {
        const port = new HeadlessI18nAdapter("en");
        port.detectLocale();
        port.reset("fr");
        expect(port.calls).toEqual([]);
        expect(port.detectLocale()).toBe("fr");
    });
    it("records calls in order", () => {
        const port = new HeadlessI18nAdapter();
        port.persistLocale("es");
        port.persistLocale("en");
        port.detectLocale();
        expect(port.calls.map((c) => c.type)).toEqual([
            "persist",
            "persist",
            "detect",
        ]);
    });
});
//# sourceMappingURL=headlessI18nAdapter.test.js.map