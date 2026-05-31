# Integración i18n con Next.js

El motor expone un sistema i18n agnóstico:

- **Core** (`@pointclick-engine/engine-core`): `Locale`, `I18nPort`,
  `i18nStore`, `registerDictionary(ies)`, `translate`, `getRandomPhrase`,
  `matchLocale`.
- **Renderer R3F** (`@pointclick-engine/engine-renderer-r3f`): `useI18n`,
  `useLocaleDetection`, `<I18nProvider>`, `<LocaleSwitcher />`.
- **Platform** (demo): `WebI18nAdapter`, `bindI18nPersistence` en
  `app/lib/platform-web-i18n.ts`.

Esta guía cubre tres formas de enchufarlo a Next.js.

---

## Comparativa rápida

| Patrón | Persistencia | URL idioma | Deps extra | Cuándo usarlo |
|---|---|---|---|---|
| **A** — Browser auto + localStorage | `localStorage` | No (siempre `/`) | 0 | App SPA simple, sin SEO multilingüe. |
| **B** — Next.js native i18n routing | URL prefix | Sí (`/es/...`, `/en/...`) | 0 | Necesitas SEO multi-locale. |
| **C** — `next-intl` | Cookie / URL | Sí | `next-intl` | UI estática con plurales ICU, fechas, números. |

---

## A — Browser auto + localStorage *(default recomendado)*

**Cuándo**: app SPA dentro de una sola ruta, sin requisito SEO.

### Paso 1 — Boot del engine

`apps/web-demo/app/lib/engine/i18n-boot.ts`:

```typescript
import {
  getI18nStore,
  registerDictionaries,
} from "@pointclick-engine/engine-core";
import { createWebI18nAdapter } from "@/app/lib/platform-web";
import { demoDictionaries } from "@/demo-content/dialogs";

export const webI18nAdapter = createWebI18nAdapter({
  availableLocales: ["es", "en"],
});

export function bootDemoI18n(): () => void {
  registerDictionaries(demoDictionaries);
  // Detect at boot + persist on every change. Returns unsubscribe.
  return getI18nStore().bindPort(webI18nAdapter);
}
```

### Paso 2 — Provider client-only

`apps/web-demo/app/components/I18nBoot.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { useLocaleDetection } from "@pointclick-engine/engine-renderer-r3f";
import { bootDemoI18n, webI18nAdapter } from "@/app/lib/engine/i18n-boot";

export function I18nBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => bootDemoI18n(), []);
  useLocaleDetection({
    port: webI18nAdapter,
    config: {
      defaultLocale: "es",
      fallbackLocale: "es",
      availableLocales: ["es", "en"],
    },
  });
  return <>{children}</>;
}
```

Montar `<I18nBoot>` envolviendo el canvas del juego (e.g. en
`app/layout.tsx` cliente).

### Paso 3 — Switcher

```tsx
import { LocaleSwitcher } from "@pointclick-engine/engine-renderer-r3f";

<LocaleSwitcher labels={{ es: "Español", en: "English" }} />
```

### Gotchas

- El render inicial usa `defaultLocale` porque `detectLocale` solo corre
  tras la hidratación cliente. Para evitar flash visible: oculta los
  `<SpeechBubble />` hasta el primer evento `i18n:localeChanged` o usa
  `Suspense` con un placeholder neutro.

---

## B — Next.js native i18n routing

**Cuándo**: necesitas URLs `/es/juego`, `/en/play`, y `next/router` detecta
el idioma automáticamente desde `Accept-Language` o el prefijo.

### B.1 — `next.config.js`

```js
module.exports = {
  i18n: {
    locales: ["es", "en"],
    defaultLocale: "es",
    localeDetection: true,
  },
};
```

### B.2 — Sync provider

`apps/web-demo/app/components/NextI18nSync.tsx`:

```tsx
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
```

### B.3 — Switcher que también cambia la URL

```tsx
import { LocaleSwitcher } from "@pointclick-engine/engine-renderer-r3f";
import { useRouter } from "next/router";

export function NextLocaleSwitcher() {
  const router = useRouter();
  return (
    <LocaleSwitcher
      renderOption={({ locale, isActive, label }) => (
        <button
          key={locale}
          onClick={() =>
            router.push(router.asPath, router.asPath, { locale })
          }
          aria-current={isActive ? "true" : undefined}
        >
          {label}
        </button>
      )}
    />
  );
}
```

### Gotchas

- En **App Router** (Next 13+) `useRouter` de `next/navigation` no expone
  `locale`. Tienes dos opciones:
  - Mantener el i18n routing **fuera del App Router** (Pages Router para
    el segmento del juego).
  - Salir de las APIs nativas y migrar a la receta **C** con `next-intl`,
    que sí está pensada para App Router.

---

## C — `next-intl`

**Cuándo**: necesitas ICU MessageFormat (plurales, género, formato de
fechas / números). Aprovechas `next-intl` para la UI estática y enchufas
el engine para los diálogos in-game.

```bash
npm install next-intl
```

`apps/web-demo/app/components/NextIntlBridge.tsx`:

```tsx
"use client";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { getI18nStore } from "@pointclick-engine/engine-core";

export function NextIntlBridge() {
  const locale = useLocale();
  useEffect(() => {
    getI18nStore().setLocale(locale);
  }, [locale]);
  return null;
}
```

El engine **no importa** `next-intl` en runtime — sólo lee el locale
activo del store. Los diálogos siguen pasando por `translate` /
`getRandomPhrase` del engine; el resto de strings de UI pueden usar
`useTranslations` de `next-intl`.

### Gotchas

- En SSR no inicialices `WebI18nAdapter` (`window` undefined). En vez de
  eso llama `getI18nStore().setLocale(locale)` directo desde el Server
  Component que ya conoce el locale.
- Si tu app usa cookies para persistir el locale (`next-intl` recomienda
  `cookies()`), puedes saltarte `WebI18nAdapter` y registrar el locale
  manualmente desde el bridge — el `i18nStore` no exige una persistencia
  concreta.

---

## Recomendación por defecto

Para la demo del repo usamos la receta **A**. Cubre el 90 % de los casos
sin tocar configuración de Next.js. Si más adelante necesitas URLs
multi-locale, migrar a **B** es trivial (sigue funcionando con el mismo
store y los mismos diccionarios).

## Ver también

- `docs/phases/phase-13-i18n/README.md` — visión arquitectónica completa
  de la fase.
- `docs/architecture/02-public-api.md` — API pública del engine.
- [Next.js i18n routing](https://nextjs.org/docs/pages/building-your-application/routing/internationalization)
- [next-intl docs](https://next-intl-docs.vercel.app/)
