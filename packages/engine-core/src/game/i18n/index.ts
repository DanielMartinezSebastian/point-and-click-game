export {
  registerDictionary,
  registerDictionaries,
  getDictionary,
  clearRegistry,
  getRegisteredLocales,
} from "./registry";

export {
  translate,
  getRandomPhrase,
  matchLocale,
  type TranslateOptions,
  type GetRandomPhraseOptions,
} from "./translator";

export { registerI18nExecutors } from "./executors";
