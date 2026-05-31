# Task 13.10 — Docs: recetas Next.js (browser, native i18n, next-intl)

**Effort**: 45 min | **Blocks**: [13.12] | **Blocked by**: [13.7, 13.8]

---

## 🎯 Objetivo

Documentar tres patrones de integración del sistema i18n del engine con Next.js. Estas recetas son **documentación**, no código en core — el engine sigue agnóstico.

---

## ✅ Success Criteria

- [ ] Nuevo archivo `docs/integrations/nextjs-i18n.md` con las 3 recetas completas.
- [ ] Cada receta incluye: cuándo usarla, snippet ejecutable, gotchas.
- [ ] Enlazado desde `docs/phases/phase-13-i18n/README.md` y desde `docs/README.md` (índice maestro).
- [ ] Sección "Comparativa rápida" con tabla.

---

## 📝 Instructions

### Step 1 — Crear `docs/integrations/nextjs-i18n.md`

Estructura:

```markdown
# Integración i18n con Next.js

El motor expone un sistema i18n agnóstico (ver `engine-core/src/game/i18n/`). Esta guía cubre cómo enchufarlo a Next.js en tres modos.

## Comparativa rápida

| Patrón | Persistencia | URL idioma | Deps extra | Dificultad |
|---|---|---|---|---|
| A — Browser auto + localStorage | localStorage | No (siempre `/`) | 0 | ★☆☆ |
| B — Next.js native i18n routing | URL prefix | Sí (`/es/...`) | 0 | ★★☆ |
| C — next-intl | Cookie/URL | Sí | `next-intl` | ★★★ |

---

## A — Browser auto + localStorage (default)

**Cuándo**: app SPA dentro de un solo route. No necesitas SEO multilingüe.

`apps/web-demo/app/lib/i18n-boot.ts`:

\`\`\`typescript
import { createWebI18nAdapter } from "./platform-web";
import { getI18nStore, registerDictionaries } from "@pointclick-engine/engine-core";
import { demoDictionaries } from "@/demo-content/dialogs";

export const webI18n = createWebI18nAdapter({
  availableLocales: ["es", "en"],
});

export function bootI18n() {
  registerDictionaries(demoDictionaries);
  return getI18nStore().bindPort(webI18n);
}
\`\`\`

En el root layout (client):

\`\`\`tsx
"use client";
import { useEffect } from "react";
import { bootI18n } from "@/app/lib/i18n-boot";

export default function ClientBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => bootI18n(), []);
  return <>{children}</>;
}
\`\`\`

**Gotcha**: el render inicial usa `defaultLocale` porque `detectLocale` solo corre tras hidratación. Para evitar flash: ocultar speech bubbles hasta el primer commit del store (suscríbete al primer evento `i18n:localeChanged`).

---

## B — Next.js native i18n routing

**Cuándo**: necesitas URLs `/es/jugar`, `/en/play` para SEO.

### B.1 — `next.config.js`

\`\`\`js
module.exports = {
  i18n: { locales: ["es", "en"], defaultLocale: "es", localeDetection: true },
};
\`\`\`

### B.2 — Sync provider

`apps/web-demo/app/components/NextI18nSync.tsx`:

\`\`\`tsx
"use client";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getI18nStore } from "@pointclick-engine/engine-core";

export function NextI18nSync() {
  const router = useRouter();
  useEffect(() => {
    if (router.locale) getI18nStore().setLocale(router.locale);
  }, [router.locale]);
  return null;
}
\`\`\`

### B.3 — Switcher que cambia la URL

\`\`\`tsx
import { LocaleSwitcher } from "@pointclick-engine/engine-renderer-r3f";
import { useRouter } from "next/router";

export function NextLocaleSwitcher() {
  const router = useRouter();
  return (
    <LocaleSwitcher
      renderOption={({ locale, isActive, label }) => (
        <button
          key={locale}
          onClick={() => router.push(router.asPath, router.asPath, { locale })}
          aria-current={isActive ? "true" : undefined}
        >{label}</button>
      )}
    />
  );
}
\`\`\`

**Gotcha**: en App Router (Next 13+), `useRouter` de `next/navigation` no expone `locale`. Usa middleware con `accept-language` parsing o migra a receta C.

---

## C — next-intl

**Cuándo**: necesitas ICU MessageFormat, fechas, números, plurales, RTL. Aprovechas next-intl para UI estática y enchufas el engine para los diálogos in-game.

\`\`\`bash
npm i next-intl
\`\`\`

`apps/web-demo/app/components/NextIntlBridge.tsx`:

\`\`\`tsx
"use client";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { getI18nStore } from "@pointclick-engine/engine-core";

export function NextIntlBridge() {
  const locale = useLocale();
  useEffect(() => { getI18nStore().setLocale(locale); }, [locale]);
  return null;
}
\`\`\`

El engine **no necesita** next-intl en runtime — solo lee el locale activo. Los diálogos siguen pasando por `translate` del engine; el resto de strings de UI pueden usar `useTranslations` de next-intl.

**Gotcha**: si usas el engine en SSR no inicialices el `WebI18nAdapter` ahí (window undefined). Llama `getI18nStore().setLocale(locale)` directo desde el server component que ya conoce el locale.

---

## Recomendación por defecto

Para la demo del repo usamos **A (browser auto)**. Cubre el caso 90/10 sin tocar config de Next.js.

## Ver también

- `docs/phases/phase-13-i18n/README.md` — visión arquitectónica.
- `docs/architecture/02-public-api.md` — API pública del engine.
\`\`\`
```

### Step 2 — Enlazar en `docs/README.md`

Añadir al índice de integraciones:

```markdown
- [Next.js i18n](integrations/nextjs-i18n.md) — 3 patrones para enchufar el engine a Next.js
```

### Step 3 — Verificar snippets

Pegar cada snippet en un sandbox / playground y confirmar que compila. No hace falta runtime — solo `tsc --noEmit`.

---

## 📚 References

- Task 13.7, 13.8, 13.9 — APIs usadas en los snippets.
- [Next.js i18n routing docs](https://nextjs.org/docs/pages/building-your-application/routing/internationalization).
- [next-intl docs](https://next-intl-docs.vercel.app/).
