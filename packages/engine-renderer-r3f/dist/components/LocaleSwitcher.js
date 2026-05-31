"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useI18n } from "../hooks/useI18n";
const DEFAULT_BUTTON_STYLE = {
    padding: "4px 10px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 400,
    color: "inherit",
};
const ACTIVE_BUTTON_STYLE = {
    ...DEFAULT_BUTTON_STYLE,
    borderColor: "currentColor",
    background: "rgba(255,255,255,0.15)",
    fontWeight: 600,
};
const SR_ONLY = {
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
export function LocaleSwitcher({ as = "buttons", labels, renderOption, className, ariaLabel = "Language", }) {
    const { locale, availableLocales, setLocale } = useI18n();
    const labelFor = (loc) => labels?.[loc] ?? loc;
    if (renderOption) {
        return (_jsx("div", { className: className, role: "group", "aria-label": ariaLabel, children: availableLocales.map((loc) => renderOption({
                locale: loc,
                isActive: loc === locale,
                label: labelFor(loc),
                onClick: () => setLocale(loc),
            })) }));
    }
    if (as === "select") {
        return (_jsxs("label", { className: className, children: [_jsx("span", { style: SR_ONLY, children: ariaLabel }), _jsx("select", { value: locale, onChange: (e) => setLocale(e.target.value), "aria-label": ariaLabel, children: availableLocales.map((loc) => (_jsx("option", { value: loc, children: labelFor(loc) }, loc))) })] }));
    }
    return (_jsx("div", { className: className, role: "group", "aria-label": ariaLabel, children: availableLocales.map((loc) => {
            const isActive = loc === locale;
            return (_jsx("button", { type: "button", onClick: () => setLocale(loc), "aria-current": isActive ? "true" : undefined, "aria-label": `Switch language to ${labelFor(loc)}`, style: isActive ? ACTIVE_BUTTON_STYLE : DEFAULT_BUTTON_STYLE, children: labelFor(loc) }, loc));
        }) }));
}
//# sourceMappingURL=LocaleSwitcher.js.map