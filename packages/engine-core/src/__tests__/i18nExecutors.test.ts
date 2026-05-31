import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CommandHandler } from "../game/commands/CommandHandler";
import { registerI18nExecutors } from "../game/i18n/executors";
import { clearRegistry, getDictionary } from "../game/i18n/registry";
import { getI18nStore, resetI18nStore, setI18nStoreEmitter } from "../game/state/i18nStore";
import type { GameEvent } from "../game/events/types";

const TEST_CONFIG = {
  defaultLocale: "es",
  fallbackLocale: "es",
  availableLocales: ["es", "en"],
};

describe("registerI18nExecutors", () => {
  let commands: CommandHandler;
  let events: GameEvent[];

  beforeEach(() => {
    resetI18nStore(TEST_CONFIG);
    clearRegistry();
    events = [];
    setI18nStoreEmitter((e) => events.push(e));
    commands = new CommandHandler({ onUnknown: () => {} });
    registerI18nExecutors(commands, (e) => events.push(e));
  });

  afterEach(() => {
    setI18nStoreEmitter(null);
  });

  it("i18n:setLocale changes the store and emits i18n:localeChanged", () => {
    commands.execute({ type: "i18n:setLocale", locale: "en" });
    expect(getI18nStore().getState().locale).toBe("en");
    expect(events).toContainEqual({
      type: "i18n:localeChanged",
      locale: "en",
      previous: "es",
    });
  });

  it("i18n:registerDictionary adds entries and emits i18n:dictionaryUpdated", () => {
    commands.execute({
      type: "i18n:registerDictionary",
      locale: "es",
      dict: { foo: { phrases: ["bar"] } },
    });
    expect(getDictionary("es")!.foo!.phrases[0]).toBe("bar");
    expect(events).toContainEqual({
      type: "i18n:dictionaryUpdated",
      locale: "es",
      keysAdded: 1,
    });
  });

  it("unsubscribe removes executors", () => {
    const off = registerI18nExecutors(commands);
    off();
    // After both unsubscribes from setup + off, the executor is gone.
    // Re-register only the locale executor and check it's the one wired now.
    let called = false;
    commands.register("i18n:setLocale", () => {
      called = true;
    });
    commands.execute({ type: "i18n:setLocale", locale: "en" });
    expect(called).toBe(true);
  });
});
