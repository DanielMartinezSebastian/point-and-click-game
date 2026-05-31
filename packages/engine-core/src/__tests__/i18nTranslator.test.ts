import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRegistry,
  registerDictionaries,
  registerDictionary,
} from "../game/i18n/registry";
import {
  getRandomPhrase,
  matchLocale,
  translate,
} from "../game/i18n/translator";
import { resetI18nStore } from "../game/state/i18nStore";

const TEST_CONFIG = {
  defaultLocale: "es",
  fallbackLocale: "es",
  availableLocales: ["es", "en"],
};

describe("translator", () => {
  beforeEach(() => {
    resetI18nStore(TEST_CONFIG);
    clearRegistry();
  });

  it("returns the raw key when nothing is registered", () => {
    expect(translate("missing")).toBe("missing");
  });

  it("returns the first phrase in the active locale", () => {
    registerDictionary("es", { hello: { phrases: ["hola"] } });
    expect(translate("hello")).toBe("hola");
  });

  it("falls back to fallbackLocale when key is missing in active locale", () => {
    resetI18nStore({ ...TEST_CONFIG, defaultLocale: "en" });
    registerDictionary("es", { hello: { phrases: ["hola"] } });
    expect(translate("hello")).toBe("hola");
  });

  it("interpolates {{var}} placeholders", () => {
    registerDictionary("es", {
      welcome: { phrases: ["Hola, {{name}}!"] },
    });
    expect(translate("welcome", { vars: { name: "Dave" } })).toBe("Hola, Dave!");
  });

  it("keeps {{var}} literal when no vars provided", () => {
    registerDictionary("es", { welcome: { phrases: ["Hola, {{name}}!"] } });
    expect(translate("welcome")).toBe("Hola, {{name}}!");
  });

  it("interpolates numbers via String()", () => {
    registerDictionary("es", { score: { phrases: ["Puntos: {{n}}"] } });
    expect(translate("score", { vars: { n: 42 } })).toBe("Puntos: 42");
  });

  it("honours opts.locale override", () => {
    registerDictionaries({
      es: { hello: { phrases: ["hola"] } },
      en: { hello: { phrases: ["hi"] } },
    });
    expect(translate("hello", { locale: "en" })).toBe("hi");
  });

  it("returns the raw key when active+fallback both lack it", () => {
    registerDictionary("es", { other: { phrases: ["x"] } });
    expect(translate("missing")).toBe("missing");
  });
});

describe("getRandomPhrase", () => {
  beforeEach(() => {
    resetI18nStore(TEST_CONFIG);
    clearRegistry();
  });

  it("always picks the first item with deterministic random()=>0", () => {
    registerDictionary("es", { wall: { phrases: ["a", "b", "c"] } });
    expect(getRandomPhrase("wall", { random: () => 0 })).toBe("a");
  });

  it("picks the last item with random()=>0.999", () => {
    registerDictionary("es", { wall: { phrases: ["a", "b", "c"] } });
    expect(getRandomPhrase("wall", { random: () => 0.999 })).toBe("c");
  });

  it("returns the key when entry is missing", () => {
    expect(getRandomPhrase("missing")).toBe("missing");
  });

  it("returns the key when phrases array is empty", () => {
    registerDictionary("es", { empty: { phrases: [] } });
    expect(getRandomPhrase("empty")).toBe("empty");
  });

  it("falls back to fallbackLocale when active dict lacks the key", () => {
    resetI18nStore({ ...TEST_CONFIG, defaultLocale: "en" });
    registerDictionary("es", { wall: { phrases: ["pared"] } });
    expect(getRandomPhrase("wall", { random: () => 0 })).toBe("pared");
  });

  it("interpolates vars in the picked phrase", () => {
    registerDictionary("es", {
      greet: { phrases: ["Hola {{name}}", "Saludos {{name}}"] },
    });
    expect(
      getRandomPhrase("greet", { random: () => 0, vars: { name: "Ana" } }),
    ).toBe("Hola Ana");
  });
});

describe("matchLocale", () => {
  it("returns exact match when available", () => {
    expect(matchLocale("en", ["es", "en"])).toBe("en");
  });

  it("returns primary subtag match", () => {
    expect(matchLocale("es-MX", ["es", "en"])).toBe("es");
  });

  it("returns null when nothing matches", () => {
    expect(matchLocale("fr-FR", ["es", "en"])).toBeNull();
  });

  it("returns null for empty candidate", () => {
    expect(matchLocale("", ["es", "en"])).toBeNull();
  });

  it("prefers exact match over primary subtag", () => {
    expect(matchLocale("es-MX", ["es-MX", "es", "en"])).toBe("es-MX");
  });
});
