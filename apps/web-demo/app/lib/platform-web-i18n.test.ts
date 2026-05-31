import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_I18N_STORAGE_KEY,
  WebI18nAdapter,
} from "./platform-web-i18n";

interface FakeStorage {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
  clear: () => void;
}

function makeFakeStorage(): FakeStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

function stubWindow(opts: {
  storage?: FakeStorage;
  language?: string;
  languages?: string[];
}) {
  const storage = opts.storage ?? makeFakeStorage();
  vi.stubGlobal("window", {
    localStorage: storage,
    navigator: {
      language: opts.language ?? "",
      languages: opts.languages ?? [],
    },
  });
  return storage;
}

const AVAILABLE = ["es", "en"];

describe("WebI18nAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    expect(port.detectLocale()).toBeNull();
    // persistLocale / clearLocale must not throw.
    port.persistLocale("es");
    port.clearLocale();
  });

  it("detectLocale returns persisted value when valid", () => {
    const storage = makeFakeStorage();
    storage.setItem(DEFAULT_I18N_STORAGE_KEY, "en");
    stubWindow({ storage });
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    expect(port.detectLocale()).toBe("en");
  });

  it("detectLocale ignores persisted value when not in availableLocales", () => {
    const storage = makeFakeStorage();
    storage.setItem(DEFAULT_I18N_STORAGE_KEY, "xx");
    stubWindow({ storage, language: "es-ES" });
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    expect(port.detectLocale()).toBe("es");
  });

  it("detectLocale uses navigator.language with primary subtag match", () => {
    stubWindow({ language: "es-MX" });
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    expect(port.detectLocale()).toBe("es");
  });

  it("detectLocale falls through navigator.languages array", () => {
    stubWindow({ language: "", languages: ["fr-FR", "en-GB"] });
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    expect(port.detectLocale()).toBe("en");
  });

  it("detectLocale returns null when nothing matches", () => {
    stubWindow({ language: "fr-FR", languages: ["fr-FR"] });
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    expect(port.detectLocale()).toBeNull();
  });

  it("persistLocale writes to localStorage", () => {
    const storage = stubWindow({});
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    port.persistLocale("es");
    expect(storage.getItem(DEFAULT_I18N_STORAGE_KEY)).toBe("es");
  });

  it("clearLocale removes the stored value", () => {
    const storage = stubWindow({});
    storage.setItem(DEFAULT_I18N_STORAGE_KEY, "en");
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    port.clearLocale();
    expect(storage.getItem(DEFAULT_I18N_STORAGE_KEY)).toBeNull();
  });

  it("respects a custom storageKey", () => {
    const storage = stubWindow({});
    const port = new WebI18nAdapter({
      availableLocales: AVAILABLE,
      storageKey: "my-app/locale",
    });
    port.persistLocale("en");
    expect(storage.getItem("my-app/locale")).toBe("en");
  });

  it("survives localStorage throwing (quota exceeded)", () => {
    const broken: FakeStorage = {
      store: new Map(),
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
      clear: () => {},
    };
    stubWindow({ storage: broken, language: "en-GB" });
    const port = new WebI18nAdapter({ availableLocales: AVAILABLE });
    // detectLocale falls back to navigator after storage throws.
    expect(port.detectLocale()).toBe("en");
    // persist + clear must not throw.
    port.persistLocale("es");
    port.clearLocale();
  });
});
