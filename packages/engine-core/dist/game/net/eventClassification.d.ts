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
export declare const EVENT_CLASSIFICATION: {
    "scene:changed": "presence"[];
    "scene:respawnRequested": "private"[];
    "player:moved": "presence"[];
    "player:collided": "private"[];
    "item:pickedUp": ("world" | "private")[];
    "item:dropped": "world"[];
    "dialog:triggered": "private"[];
    "dialog:dismissed": "private"[];
    "transition:triggered": "private"[];
    "transition:started": "private"[];
    "transition:completed": "presence"[];
    "transition:colliderClicked": "private"[];
    "player:walkStarted": "private"[];
    "player:walkCompleted": "private"[];
    "player:walkAborted": "private"[];
    "audio:sfxRequested": "private"[];
    "audio:musicRequested": "private"[];
    "audio:musicStopped": "private"[];
    "audio:settingsChanged": "private"[];
    "i18n:localeChanged": "private"[];
    "i18n:dictionaryUpdated": "private"[];
    "net:playerJoined": "private"[];
    "net:playerLeft": "private"[];
    "net:status": "private"[];
};
export declare function classifyEvent(type: GameEventType): SyncClass[];
export declare const isWorld: (t: GameEventType) => boolean;
export declare const isPresence: (t: GameEventType) => boolean;
/** ¿Debe salir a la red? (world o presence). Los `private` jamás. */
export declare const shouldReplicate: (t: GameEventType) => boolean;
//# sourceMappingURL=eventClassification.d.ts.map