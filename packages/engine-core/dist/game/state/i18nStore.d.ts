import { type I18nConfig, type I18nState, type Locale } from "../types";
import type { GameEvent } from "../events/types";
import type { I18nPort } from "../../ports/i18n";
type Listener = (state: I18nState) => void;
type StoreEmitter = (event: GameEvent) => void;
/**
 * Inject the runtime's event emitter. Mirrors `setSceneStoreEmitter`. When
 * unset (the default), the store runs in zero-event mode.
 */
export declare function setI18nStoreEmitter(emitter: StoreEmitter | null): void;
export interface I18nStore {
    getState(): I18nState;
    subscribe(listener: Listener): () => void;
    setLocale(locale: Locale): void;
    setAvailableLocales(locales: Locale[]): void;
    setFallbackLocale(locale: Locale): void;
    hydrate(state: Partial<I18nState>): void;
    reset(): void;
    /**
     * Connect the store to an {@link I18nPort}: hydrate `locale` from
     * `port.detectLocale()` once, then persist every subsequent change via
     * `port.persistLocale`. Returns an unsubscribe function.
     */
    bindPort(port: I18nPort): () => void;
}
export declare function createI18nStore(config?: I18nConfig): I18nStore;
export declare function getI18nStore(): I18nStore;
export declare function resetI18nStore(config?: I18nConfig): void;
/** Non-React helper: subscribe to the singleton store. */
export declare function subscribeI18n(listener: Listener): () => void;
export {};
//# sourceMappingURL=i18nStore.d.ts.map