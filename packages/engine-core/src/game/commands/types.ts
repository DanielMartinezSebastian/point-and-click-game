import type { DialogDictionary, GameVec3, Locale, SoundCategory } from "../types";

// Duplicated from ports/audio.ts to avoid circular imports.
type AudioMuteTarget = "master" | SoundCategory;

/**
 * Union exhaustiva de todos los comandos que el motor acepta.
 * Naming: <domain>:<action> (ver ADR-0006).
 */
export type GameCommand =
  // Scene
  | { type: "scene:set"; sceneId: string }
  | { type: "scene:respawn" }
  // Player
  | { type: "player:move"; position: GameVec3 }
  | { type: "player:stop" }
  | { type: "player:walkTo"; position: GameVec3 }
  // Inventory
  | { type: "inventory:toggle" }
  | { type: "inventory:pickup"; itemId: string }
  | { type: "inventory:drop"; itemId: string; slotIndex: number }
  // Dialog
  | { type: "dialog:trigger"; dialogKey: string }
  | { type: "dialog:dismiss" }
  // Transitions
  | { type: "transition:activate"; transitionId: string }
  | { type: "transition:cancel"; transitionId: string }
  // Audio
  | { type: "audio:playSfx"; soundUrl: string; category?: SoundCategory; volume?: number }
  | { type: "audio:setMuted"; target: AudioMuteTarget; muted: boolean }
  | { type: "audio:setVolume"; target: AudioMuteTarget; volume: number }
  // i18n
  | { type: "i18n:setLocale"; locale: Locale }
  | { type: "i18n:registerDictionary"; locale: Locale; dict: DialogDictionary };

export type GameCommandType = GameCommand["type"];
