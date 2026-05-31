import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRegistry,
  getDictionary,
  getRegisteredLocales,
  registerDictionaries,
  registerDictionary,
} from "../game/i18n/registry";

describe("i18n registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers a fresh dictionary", () => {
    registerDictionary("es", { hello: { phrases: ["hola"] } });
    expect(getDictionary("es")).toEqual({ hello: { phrases: ["hola"] } });
  });

  it("merges incrementally when called twice with new keys", () => {
    registerDictionary("es", { hello: { phrases: ["hola"] } });
    registerDictionary("es", { bye: { phrases: ["adios"] } });
    const dict = getDictionary("es")!;
    expect(dict.hello!.phrases[0]).toBe("hola");
    expect(dict.bye!.phrases[0]).toBe("adios");
  });

  it("warns and overwrites when the same key is registered twice", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerDictionary("es", { hello: { phrases: ["hola"] } });
    registerDictionary("es", { hello: { phrases: ["buenas"] } });
    expect(getDictionary("es")!.hello!.phrases[0]).toBe("buenas");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("registerDictionaries registers many locales at once", () => {
    registerDictionaries({
      es: { greet: { phrases: ["hola"] } },
      en: { greet: { phrases: ["hi"] } },
    });
    expect(getDictionary("es")!.greet!.phrases[0]).toBe("hola");
    expect(getDictionary("en")!.greet!.phrases[0]).toBe("hi");
  });

  it("getDictionary returns undefined for unknown locale", () => {
    expect(getDictionary("xx")).toBeUndefined();
  });

  it("clearRegistry empties everything", () => {
    registerDictionary("es", { a: { phrases: ["x"] } });
    clearRegistry();
    expect(getDictionary("es")).toBeUndefined();
    expect(getRegisteredLocales()).toEqual([]);
  });

  it("getRegisteredLocales lists currently-registered locales", () => {
    registerDictionary("es", { a: { phrases: ["x"] } });
    registerDictionary("en", { a: { phrases: ["y"] } });
    expect(getRegisteredLocales().sort()).toEqual(["en", "es"]);
  });
});
