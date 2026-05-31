/**
 * Demo dialog types.
 *
 * The engine itself uses `Locale = string` so any BCP-47 tag is valid. The
 * demo narrows that down for autocompletion in scene/item authoring.
 */

import type {
  DialogDictionary as EngineDialogDictionary,
  DialogEntry as EngineDialogEntry,
  Locale as EngineLocale,
  LocaleDictionaries,
} from "@pointclick-engine/engine-core";

/** Narrowed alias for autocompletion inside the demo. */
export type DemoLocale = "es" | "en";

/** Re-export of the engine Locale for callers that want the wide type. */
export type Locale = EngineLocale;

export type DialogKey = string;

export type DialogEntry = EngineDialogEntry;
export type DialogDictionary = EngineDialogDictionary;

/** Legacy alias retained for backward-compat with existing demo code. */
export type DialogLocales = LocaleDictionaries;
