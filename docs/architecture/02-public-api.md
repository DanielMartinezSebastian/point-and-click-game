# API Pública (`publicApi.ts`)

**Ubicación actual**: `app/lib/engine/publicApi.ts`
**Ubicación post-Fase 2**: `packages/engine-core/src/index.ts` (parte agnóstica) + `apps/web-demo/.../publicApi.ts` (parte R3F)

## Contrato Estable (v1)

Estos exports **NO se rompen sin issue + migración + bump semver**.

### Tipos

```ts
GameVec3
GameSceneGround, GameSceneWall, GameSceneConfig
GameSceneInteraction, GameSceneInteractionDialogKeys
GameItemDropOutcome, GameItemRule, GameItemConfig
GameRuleConfig
GameRuntimeConfig, GameRuntime
GameState, GameActions
GameRuntimeEvent, GameRuntimeEventHandler
GameViewportProps
```

### Funciones / Componentes

```ts
createGameRuntime(config?: GameRuntimeConfig): GameRuntime
registerScene(config: GameSceneConfig): void
registerItem(config: GameItemConfig): void
registerRule(config: GameRuleConfig): void
getGameState(): GameState
getGameActions(): GameActions
useGameState<T>(selector: (s: GameState) => T): T
useGameActions(): GameActions
GameViewport(props: GameViewportProps): ReactNode
```

### i18n (v0.4.0+, Phase 13)

Tipos:

```ts
Locale, DialogEntry, DialogDictionary, LocaleDictionaries
I18nConfig, I18nState, I18nPort, I18nStore
UseI18nResult, UseLocaleDetectionOptions
LocaleSwitcherProps, LocaleSwitcherRenderOption, I18nProviderProps
```

Funciones / componentes:

```ts
// Core
registerDictionary(locale, dict): void
registerDictionaries(all): void
getDictionary(locale): DialogDictionary | undefined
translate(key, opts?): string
getRandomPhrase(key, opts?): string
matchLocale(candidate, available): Locale | null
createI18nStore(config): I18nStore
getI18nStore(): I18nStore
resetI18nStore(config?): void
subscribeI18n(listener): () => void
setI18nStoreEmitter(emitter): void
HeadlessI18nAdapter // class implements I18nPort
registerI18nExecutors(handler, emit?): () => void

// R3F
useI18n(): UseI18nResult
useLocaleDetection({ port, config? }): void
<I18nProvider config={...}>...</I18nProvider>
<LocaleSwitcher as|labels|renderOption|className|ariaLabel />
```

Adapter web (no es parte del package; vive en `apps/web-demo/app/lib/`):

```ts
createWebI18nAdapter({ availableLocales, storageKey? }): WebI18nAdapter
bindI18nPersistence(store, port): () => void
```

Recetas Next.js: ver [`../integrations/nextjs-i18n.md`](../integrations/nextjs-i18n.md).

## Cambios Permitidos (no breaking)

- ✅ Añadir exports opcionales nuevos
- ✅ Añadir campos opcionales en tipos públicos
- ✅ Mejoras internas sin tocar firmas

## Cambios Breaking (requieren migración)

- ❌ Renombrar / remover exports
- ❌ Cambiar firmas (parámetros, return)
- ❌ Cambiar semántica de eventos / acciones

## Si necesitas cambiar la API pública

1. Abre issue explicando por qué
2. Propón migration path para consumidores
3. Documenta en `LIBRARY_API_CONTRACT_V1.md`
4. Bump semver mayor si es breaking

## Commands & Events (Phase 4)

`createGameRuntime()` ahora devuelve también `executeCommand`, `on`, `emit`, `dispose`:

```ts
const runtime = createGameRuntime({ scenes });
runtime.on("scene:changed", handler);      // suscribirse a eventos
runtime.executeCommand({ type: "scene:set", sceneId: "town" }); // enviar comandos
const rt = getGameRuntime();               // acceso al singleton desde cualquier sitio
```

Ver catálogo completo en [`05-bidirectional-communication.md`](05-bidirectional-communication.md).

## Ver también

- `../LIBRARY_API_CONTRACT_V1.md` — Contrato formal
- `../LIBRARY_CONSUMPTION_GUIDE.md` — Cómo se consume
- [`05-bidirectional-communication.md`](05-bidirectional-communication.md) — Commands & Events API (web ↔ juego)
