# Task 13.9 — R3F componente: LocaleSwitcher (headless + estilos default)

**Effort**: 45 min | **Blocks**: [13.11] | **Blocked by**: [13.8]

---

## 🎯 Objetivo

Componente reutilizable para cambiar el idioma. Doble API: **headless** (consumidor pasa `renderOption` y construye su propia UI) y **default styling** (botones simples preescenados para usos rápidos).

---

## ✅ Success Criteria

- [ ] `<LocaleSwitcher />` renderiza un botón/select por cada `availableLocales`.
- [ ] Click/change dispara `useI18n().setLocale(locale)`.
- [ ] Marca el locale activo con `aria-current="true"` (o `selected` si es `<select>`).
- [ ] Prop `as?: "buttons" | "select"` (default `"buttons"`).
- [ ] Prop `renderOption?: (opts: { locale, isActive, label, onClick }) => ReactNode` para modo headless.
- [ ] Prop `labels?: Record<Locale, string>` para mostrar "Español" en vez de "es". Default: usa el código tal cual.
- [ ] Accesible: `<button>` con `aria-label="Switch language to {label}"`; en modo `select` un `<label>` asociado.
- [ ] Estilos por defecto mínimos (CSS inline o CSS module) — el demo los puede sobreescribir.
- [ ] Tests: render + click cambia locale + headless renderOption funciona.

---

## 📝 Instructions

### Step 1 — Crear `packages/engine-renderer-r3f/src/components/LocaleSwitcher.tsx`

```typescript
"use client";

import type { ReactNode } from "react";
import { useI18n } from "../hooks/useI18n";
import type { Locale } from "@pointclick-engine/engine-core";

export interface LocaleSwitcherRenderOption {
  locale: Locale;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

export interface LocaleSwitcherProps {
  as?: "buttons" | "select";
  labels?: Record<Locale, string>;
  renderOption?: (opts: LocaleSwitcherRenderOption) => ReactNode;
  className?: string;
  ariaLabel?: string;
}

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
        <span className="sr-only">{ariaLabel}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label={ariaLabel}
        >
          {availableLocales.map((loc) => (
            <option key={loc} value={loc}>{labelFor(loc)}</option>
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
            style={{
              padding: "4px 10px",
              border: "1px solid",
              borderColor: isActive ? "currentColor" : "transparent",
              background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
              cursor: "pointer",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {labelFor(loc)}
          </button>
        );
      })}
    </div>
  );
}
```

### Step 2 — Export

`packages/engine-renderer-r3f/src/index.ts`:

```typescript
export {
  LocaleSwitcher,
  type LocaleSwitcherProps,
  type LocaleSwitcherRenderOption,
} from "./components/LocaleSwitcher";
```

### Step 3 — Tests

`packages/engine-renderer-r3f/src/__tests__/LocaleSwitcher.test.tsx`:

- Render con availableLocales=["es","en"] → 2 botones.
- Click en "en" → setLocale("en") llamado + aria-current actualizado.
- `as="select"` → renderiza `<select>` con `<option>` correctos.
- `renderOption` headless → consumidor decide markup.
- `labels={{es:"Español", en:"English"}}` → muestra los labels.

### Step 4 — Validación

```bash
cd packages/engine-renderer-r3f && npm run typecheck && npm run test && npm run build
```

---

## 📚 References

- Task 13.8 — `useI18n`.
- ARIA: [Combobox / button group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/).
