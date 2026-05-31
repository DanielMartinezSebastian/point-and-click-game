import type { ReactNode } from "react";
import type { Locale } from "@pointclick-engine/engine-core";
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
/**
 * Drop-in language switcher backed by the engine's i18n store. Three modes:
 *
 * 1. `as="buttons"` (default): one `<button>` per available locale.
 * 2. `as="select"`: native `<select>` for compact UIs.
 * 3. `renderOption`: render-prop for fully custom markup; the component
 *    becomes a thin wrapper that wires `onClick` and `isActive`.
 */
export declare function LocaleSwitcher({ as, labels, renderOption, className, ariaLabel, }: LocaleSwitcherProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LocaleSwitcher.d.ts.map