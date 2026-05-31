import { describe, expect, it } from "vitest";
// Smoke test only — exports compile and resolve. The hook's reactive logic
// is fully covered by `i18nStore.test.ts` / `i18nTranslator.test.ts` in
// `@pointclick-engine/engine-core`. We avoid adding `@testing-library/react`
// as a dev dep for a one-line `useState + useEffect(subscribe)` wrapper.
describe("R3F i18n hook exports", () => {
    it("exports useI18n and useLocaleDetection from the package barrel", async () => {
        const mod = await import("../index");
        expect(typeof mod.useI18n).toBe("function");
        expect(typeof mod.useLocaleDetection).toBe("function");
        expect(typeof mod.I18nProvider).toBe("function");
    });
});
//# sourceMappingURL=useI18n.test.js.map