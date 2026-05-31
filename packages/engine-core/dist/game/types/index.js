// Core types for point-and-click game engine
// Framework-agnostic definitions
export const DEFAULT_AUDIO_SETTINGS = {
    masterMuted: false,
    musicMuted: false,
    sfxMuted: false,
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
};
/** Conservative defaults. Hosts should override via `createI18nStore` / `resetI18nStore`. */
export const DEFAULT_I18N_CONFIG = {
    defaultLocale: "en",
    fallbackLocale: "en",
    availableLocales: ["en"],
};
//# sourceMappingURL=index.js.map