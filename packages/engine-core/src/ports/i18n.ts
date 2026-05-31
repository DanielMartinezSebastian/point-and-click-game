import type { Locale } from "../game/types";

/**
 * Port abstracting how the engine reads / writes the user's preferred locale.
 *
 * Platform adapters (web, native, server) implement this. Core never reads
 * `navigator`, `localStorage`, cookies or framework routing directly.
 */
export interface I18nPort {
  /**
   * Locale to use at boot. Implementations typically check persisted storage
   * first, then fall back to browser / OS hints. Return `null` when no
   * preference is detectable so the store keeps `defaultLocale`.
   */
  detectLocale(): Locale | null;

  /** Persist the user's choice for subsequent sessions. */
  persistLocale(locale: Locale): void;

  /** Clear any persistence. Useful for logout / settings reset. */
  clearLocale?(): void;
}
