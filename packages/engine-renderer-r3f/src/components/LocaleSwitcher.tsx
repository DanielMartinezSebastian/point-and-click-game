"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Locale } from "@pointclick-engine/engine-core";
import { useI18n } from "../hooks/useI18n";

/** Render-prop payload exposed for fully custom markup. */
export interface LocaleSwitcherRenderOption {
  locale: Locale;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

export interface LocaleSwitcherProps {
  /** Visual mode for the built-in markup. Default `"buttons"`. */
  as?: "buttons" | "select";
  /** Human-readable label per locale (e.g. `{ es: "Español" }`). */
  labels?: Record<Locale, string>;
  /**
   * Render-prop. When provided, the component renders nothing of its own
   * and lets the caller decide markup. Receives one payload per locale.
   */
  renderOption?: (opts: LocaleSwitcherRenderOption) => ReactNode;
  className?: string;
  /** Accessible group / select label. Default `"Language"`. */
  ariaLabel?: string;
}

const DEFAULT_BUTTON_STYLE: CSSProperties = {
  padding: "4px 10px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 400,
  color: "inherit",
};

const ACTIVE_BUTTON_STYLE: CSSProperties = {
  ...DEFAULT_BUTTON_STYLE,
  borderColor: "currentColor",
  background: "rgba(255,255,255,0.15)",
  fontWeight: 600,
};

const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

/**
 * Drop-in language switcher backed by the engine's i18n store. Three modes:
 *
 * 1. `as="buttons"` (default): one `<button>` per available locale.
 * 2. `as="select"`: native `<select>` for compact UIs.
 * 3. `renderOption`: render-prop for fully custom markup; the component
 *    becomes a thin wrapper that wires `onClick` and `isActive`.
 */
export function LocaleSwitcher({
  as = "buttons",
  labels,
  renderOption,
  className,
  ariaLabel = "Language",
}: LocaleSwitcherProps) {
  const { locale, availableLocales, setLocale } = useI18n();
  const labelFor = (loc: Locale) => labels?.[loc] ?? loc;

  if (renderOption) {
    return (
      <div className={className} role="group" aria-label={ariaLabel}>
        {availableLocales.map((loc) =>
          renderOption({
            locale: loc,
            isActive: loc === locale,
            label: labelFor(loc),
            onClick: () => setLocale(loc),
          }),
        )}
      </div>
    );
  }

  if (as === "select") {
    return (
      <label className={className}>
        <span style={SR_ONLY}>{ariaLabel}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label={ariaLabel}
        >
          {availableLocales.map((loc) => (
            <option key={loc} value={loc}>
              {labelFor(loc)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {availableLocales.map((loc) => {
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-current={isActive ? "true" : undefined}
            aria-label={`Switch language to ${labelFor(loc)}`}
            style={isActive ? ACTIVE_BUTTON_STYLE : DEFAULT_BUTTON_STYLE}
          >
            {labelFor(loc)}
          </button>
        );
      })}
    </div>
  );
}
