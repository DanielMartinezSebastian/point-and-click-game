import type { Locale } from "../game/types";
import type { I18nPort } from "./i18n";

export type HeadlessI18nCall =
  | { type: "detect" }
  | { type: "persist"; locale: Locale }
  | { type: "clear" };

/**
 * Test / SSR-friendly implementation of {@link I18nPort}. Records every call
 * and stores the persisted locale in memory.
 */
export class HeadlessI18nAdapter implements I18nPort {
  readonly calls: HeadlessI18nCall[] = [];
  private stored: Locale | null;

  constructor(initial: Locale | null = null) {
    this.stored = initial;
  }

  detectLocale(): Locale | null {
    this.calls.push({ type: "detect" });
    return this.stored;
  }

  persistLocale(locale: Locale): void {
    this.calls.push({ type: "persist", locale });
    this.stored = locale;
  }

  clearLocale(): void {
    this.calls.push({ type: "clear" });
    this.stored = null;
  }

  /** Reset call log and stored value. */
  reset(initial: Locale | null = null): void {
    this.calls.length = 0;
    this.stored = initial;
  }
}
