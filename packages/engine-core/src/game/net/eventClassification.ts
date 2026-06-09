import type { GameEventType } from "../events/types";

/** Clase de sincronización de un evento. Un evento puede pertenecer a varias. */
export type SyncClass = "world" | "presence" | "private";

/**
 * Clasificación exhaustiva. `satisfies` obliga a cubrir TODOS los GameEventType:
 * si añades un evento nuevo y no lo clasificas, TypeScript falla aquí.
 *
 * - world    → estado compartido, replicado a todos, persistente (puertas, ítems colocados).
 * - presence → efímero por jugador, fan-out a misma escena (posición, escena).
 * - private  → local, NUNCA cruza la red (diálogos, audio, animación de walk).
 */
export const EVENT_CLASSIFICATION = {
  // Scene
  "scene:changed": ["presence"], // cambia MI escena → actualiza mi presence
  "scene:respawnRequested": ["private"],
  // Player
  "player:moved": ["presence"], // alta frecuencia; throttle en el borde
  "player:collided": ["private"],
  // Inventory (pickup quita del world y añade a mi inventario)
  "item:pickedUp": ["world", "private"],
  "item:dropped": ["world"], // place/consume mutan placedItems compartidos
  // Dialog
  "dialog:triggered": ["private"],
  "dialog:dismissed": ["private"],
  // Transitions
  "transition:triggered": ["private"],
  "transition:started": ["private"],
  "transition:completed": ["presence"], // cambio de escena propio
  "transition:colliderClicked": ["private"],
  // Player walking (se deriva de presence en remotos)
  "player:walkStarted": ["private"],
  "player:walkCompleted": ["private"],
  "player:walkAborted": ["private"],
  // Audio (local)
  "audio:sfxRequested": ["private"],
  "audio:musicRequested": ["private"],
  "audio:musicStopped": ["private"],
  "audio:settingsChanged": ["private"],
  // i18n (local)
  "i18n:localeChanged": ["private"],
  "i18n:dictionaryUpdated": ["private"],
  // Net (locales para UI; nunca se replican)
  "net:playerJoined": ["private"],
  "net:playerLeft": ["private"],
  "net:status": ["private"],
} satisfies Record<GameEventType, SyncClass[]>;

export function classifyEvent(type: GameEventType): SyncClass[] {
  return EVENT_CLASSIFICATION[type] ?? ["private"];
}
export const isWorld = (t: GameEventType): boolean => classifyEvent(t).includes("world");
export const isPresence = (t: GameEventType): boolean =>
  classifyEvent(t).includes("presence");
/** ¿Debe salir a la red? (world o presence). Los `private` jamás. */
export const shouldReplicate = (t: GameEventType): boolean =>
  isWorld(t) || isPresence(t);
