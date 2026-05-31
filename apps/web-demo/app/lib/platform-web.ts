/**
 * platform-web – Capa de interoperabilidad web.
 *
 * Define puertos (interfaces) para las capacidades de plataforma web:
 * storage, routing, clipboard, network, timers y entorno del navegador.
 *
 * El runtime consume estos puertos en lugar de llamar directamente a APIs
 * web (localStorage, navigator.clipboard, fetch, etc.), lo que permite:
 * - Fallback seguro en SSR/entornos sin window.
 * - Sustituir adapters en tests sin mockear globals.
 * - Ampliar hacia otras plataformas sin cambiar código del motor.
 *
 * Uso:
 * ```ts
 * import { localStorageAdapter, browserClipboardAdapter } from "@/lib/platform-web";
 * ```
 */

// ---------------------------------------------------------------------------
// StoragePort – persistencia clave/valor
// ---------------------------------------------------------------------------

/** Puerto de almacenamiento persistente (clave/valor). */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Adapter que delega en localStorage con fallback seguro para SSR.
 * No lanza en entornos sin window (Node.js, Edge runtime).
 */
export class LocalStorageAdapter implements StoragePort {
  private get store(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  getItem(key: string): string | null {
    return this.store?.getItem(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store?.setItem(key, value);
  }

  removeItem(key: string): void {
    this.store?.removeItem(key);
  }
}

/** Adapter de localStorage listo para usar. */
export const localStorageAdapter: StoragePort = new LocalStorageAdapter();

/** Adapter noop útil para tests o entornos sin persistencia. */
export class NoopStorageAdapter implements StoragePort {
  private readonly _data = new Map<string, string>();
  getItem(key: string): string | null {
    return this._data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this._data.set(key, value);
  }
  removeItem(key: string): void {
    this._data.delete(key);
  }
}

// ---------------------------------------------------------------------------
// ClipboardPort – portapapeles
// ---------------------------------------------------------------------------

/** Puerto de escritura en portapapeles. */
export interface ClipboardPort {
  writeText(text: string): Promise<void>;
}

/**
 * Adapter que delega en navigator.clipboard.
 * Devuelve error silencioso si el API no está disponible (SSR, iframes sin permiso).
 */
export class BrowserClipboardAdapter implements ClipboardPort {
  async writeText(text: string): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(text);
  }
}

/** Adapter de portapapeles del navegador listo para usar. */
export const browserClipboardAdapter: ClipboardPort =
  new BrowserClipboardAdapter();

// ---------------------------------------------------------------------------
// RoutingPort – navegación
// ---------------------------------------------------------------------------

/** Puerto de navegación entre rutas. */
export interface RoutingPort {
  navigate(path: string): void;
  getCurrentPath(): string;
}

/** Adapter que delega en window.location (sólo en cliente). */
export class BrowserRoutingAdapter implements RoutingPort {
  navigate(path: string): void {
    if (typeof window === "undefined") return;
    window.location.href = path;
  }

  getCurrentPath(): string {
    if (typeof window === "undefined") return "/";
    return window.location.pathname;
  }
}

/** Adapter de routing del navegador listo para usar. */
export const browserRoutingAdapter: RoutingPort = new BrowserRoutingAdapter();

// ---------------------------------------------------------------------------
// NetworkPort – peticiones de red
// ---------------------------------------------------------------------------

/** Opciones para una petición de red. */
export type NetworkRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
};

/** Respuesta normalizada de una petición de red. */
export type NetworkResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
};

/** Puerto de red para peticiones HTTP. */
export interface NetworkPort {
  request<T = unknown>(
    url: string,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>>;
}

/** Adapter que delega en fetch. */
export class FetchNetworkAdapter implements NetworkPort {
  async request<T = unknown>(
    url: string,
    options: NetworkRequestOptions = {},
  ): Promise<NetworkResponse<T>> {
    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body,
      });

      let data: T | null = null;
      try {
        data = (await response.json()) as T;
      } catch {
        data = null;
      }

      return { ok: response.ok, status: response.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    }
  }
}

/** Adapter de red listo para usar. */
export const fetchNetworkAdapter: NetworkPort = new FetchNetworkAdapter();

// ---------------------------------------------------------------------------
// TimerPort – temporizadores
// ---------------------------------------------------------------------------

export type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

/** Puerto para temporizadores (timeout/interval) desacoplado de window. */
export interface TimerPort {
  setTimeout(callback: () => void, delayMs?: number): TimerHandle;
  clearTimeout(handle: TimerHandle | null | undefined): void;
  setInterval(callback: () => void, delayMs?: number): TimerHandle;
  clearInterval(handle: TimerHandle | null | undefined): void;
}

/** Adapter de temporizadores usando globalThis para SSR/cliente. */
export class BrowserTimerAdapter implements TimerPort {
  setTimeout(callback: () => void, delayMs?: number): TimerHandle {
    return globalThis.setTimeout(callback, delayMs);
  }

  clearTimeout(handle: TimerHandle | null | undefined): void {
    if (handle == null) return;
    globalThis.clearTimeout(handle);
  }

  setInterval(callback: () => void, delayMs?: number): TimerHandle {
    return globalThis.setInterval(callback, delayMs);
  }

  clearInterval(handle: TimerHandle | null | undefined): void {
    if (handle == null) return;
    globalThis.clearInterval(handle);
  }
}

/** Adapter de temporizadores listo para usar. */
export const browserTimerAdapter: TimerPort = new BrowserTimerAdapter();

// ---------------------------------------------------------------------------
// EnvironmentPort – APIs de entorno (DOM, media, RAF, eventos)
// ---------------------------------------------------------------------------

export type AnimationFrameHandle = number;

export type EnvironmentMediaQuery = {
  matches: boolean;
  subscribe: (listener: (matches: boolean) => void) => () => void;
};

/** Puerto para capacidades de entorno del navegador. */
export interface EnvironmentPort {
  matchMedia(query: string): EnvironmentMediaQuery;
  getInnerHeight(fallback?: number): number;
  requestAnimationFrame(callback: () => void): AnimationFrameHandle;
  cancelAnimationFrame(handle: AnimationFrameHandle | null | undefined): void;
  addWindowEventListener(
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  addDocumentEventListener(
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  mountStyleTag(
    attributeName: string,
    attributeValue: string,
    cssText: string,
  ): () => void;
}

/** Adapter de entorno con fallback seguro para SSR. */
export class BrowserEnvironmentAdapter implements EnvironmentPort {
  matchMedia(query: string): EnvironmentMediaQuery {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return {
        matches: false,
        subscribe: () => () => {},
      };
    }

    const mediaQuery = window.matchMedia(query);
    return {
      matches: mediaQuery.matches,
      subscribe: (listener) => {
        const onChange = (event: MediaQueryListEvent) => {
          listener(event.matches);
        };
        mediaQuery.addEventListener("change", onChange);
        return () => {
          mediaQuery.removeEventListener("change", onChange);
        };
      },
    };
  }

  getInnerHeight(fallback = 800): number {
    if (typeof window === "undefined") return fallback;
    return window.innerHeight;
  }

  requestAnimationFrame(callback: () => void): AnimationFrameHandle {
    if (typeof window === "undefined") {
      return Number(globalThis.setTimeout(callback, 16));
    }
    return window.requestAnimationFrame(callback);
  }

  cancelAnimationFrame(handle: AnimationFrameHandle | null | undefined): void {
    if (handle == null) return;
    if (typeof window === "undefined") {
      globalThis.clearTimeout(handle);
      return;
    }
    window.cancelAnimationFrame(handle);
  }

  addWindowEventListener(
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(eventName, listener, options);
    return () => {
      window.removeEventListener(eventName, listener, options);
    };
  }

  addDocumentEventListener(
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    if (typeof document === "undefined") return () => {};
    document.addEventListener(eventName, listener, options);
    return () => {
      document.removeEventListener(eventName, listener, options);
    };
  }

  mountStyleTag(
    attributeName: string,
    attributeValue: string,
    cssText: string,
  ): () => void {
    if (typeof document === "undefined") return () => {};
    const styleEl = document.createElement("style");
    styleEl.setAttribute(attributeName, attributeValue);
    styleEl.innerHTML = cssText;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }
}

/** Adapter de entorno del navegador listo para usar. */
export const browserEnvironmentAdapter: EnvironmentPort =
  new BrowserEnvironmentAdapter();

// ---------------------------------------------------------------------------
// Barrel: plataforma completa lista para usar
// ---------------------------------------------------------------------------

/** Conjunto de adapters web por defecto. Úsalo en el cliente. */
export const webPlatform = {
  storage: localStorageAdapter,
  clipboard: browserClipboardAdapter,
  routing: browserRoutingAdapter,
  network: fetchNetworkAdapter,
  timer: browserTimerAdapter,
  env: browserEnvironmentAdapter,
} as const;

export type WebPlatform = typeof webPlatform;

// ---------------------------------------------------------------------------
// Audio adapters (re-export desde platform-web-audio)
// ---------------------------------------------------------------------------

export {
  webAudioAdapter,
  WebAudioAdapter,
  bindAudioPersistence,
} from "./platform-web-audio";

// ---------------------------------------------------------------------------
// i18n adapter (re-export desde platform-web-i18n)
// ---------------------------------------------------------------------------

export {
  WebI18nAdapter,
  createWebI18nAdapter,
  bindI18nPersistence,
  DEFAULT_I18N_STORAGE_KEY,
  type WebI18nAdapterOptions,
} from "./platform-web-i18n";
