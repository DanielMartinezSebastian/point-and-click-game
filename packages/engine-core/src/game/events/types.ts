import type { AudioSettings, GameScene, GameVec3, Locale, SoundCategory } from "../types";
import type { PlayerDescriptor } from "../net/playerIdentity";
import type { ConnectionStatus, PlayerId } from "../../ports/multiplayer";

/**
 * Union exhaustiva de todos los eventos que el motor puede emitir.
 * Naming: <domain>:<action> (ver ADR-0006).
 */
export type GameEvent =
  // Scene
  | { type: "scene:changed"; sceneId: string; scene: GameScene }
  | { type: "scene:respawnRequested"; sceneId: string }
  // Player
  | {
      type: "player:moved";
      position: GameVec3;
      action: "idle" | "north" | "south" | "west" | "east";
    }
  | { type: "player:collided"; reason: "boundary" | "stuck" | "pathblocked"; position: GameVec3 }
  // Inventory
  | { type: "item:pickedUp"; itemId: string; quantity: number }
  | {
      type: "item:dropped";
      itemId: string;
      outcome: "consume" | "place" | "return";
      interactionId?: string;
    }
  // Dialog
  | { type: "dialog:triggered"; text: string; dialogKey?: string; source: string }
  | { type: "dialog:dismissed"; dialogKey?: string }
  // Transitions
  | { type: "transition:triggered"; transitionId: string; targetSceneId: string }
  | { type: "transition:started"; transitionId: string }
  | { type: "transition:completed"; fromSceneId: string; toSceneId: string }
  | { type: "transition:colliderClicked"; transitionId: string; position: GameVec3 }
  // Player walking
  | { type: "player:walkStarted"; targetPosition: GameVec3 }
  | { type: "player:walkCompleted"; position: GameVec3 }
  | {
      type: "player:walkAborted";
      reason: "user-input" | "collision" | "unreachable";
    }
  // Audio
  | { type: "audio:sfxRequested"; soundUrl: string; category: SoundCategory; volume?: number }
  | { type: "audio:musicRequested"; trackUrl: string; fadeMs?: number; volume?: number; loop?: boolean }
  | { type: "audio:musicStopped"; fadeMs?: number }
  | { type: "audio:settingsChanged"; settings: AudioSettings }
  // i18n
  | { type: "i18n:localeChanged"; locale: Locale; previous: Locale }
  | { type: "i18n:dictionaryUpdated"; locale: Locale; keysAdded: number }
  // Net (locales para UI; nunca se replican — ver eventClassification)
  | { type: "net:playerJoined"; player: PlayerDescriptor }
  | { type: "net:playerLeft"; playerId: PlayerId }
  | { type: "net:status"; status: ConnectionStatus };

export type GameEventType = GameEvent["type"];

export type GameEventHandler<T extends GameEventType = GameEventType> = (
  event: Extract<GameEvent, { type: T }>,
) => void;
