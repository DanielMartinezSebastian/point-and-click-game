import type { DialogDictionary, GameVec3, Locale, SoundCategory } from "../types";
type AudioMuteTarget = "master" | SoundCategory;
/**
 * Union exhaustiva de todos los comandos que el motor acepta.
 * Naming: <domain>:<action> (ver ADR-0006).
 */
export type GameCommand = {
    type: "scene:set";
    sceneId: string;
} | {
    type: "scene:respawn";
} | {
    type: "player:move";
    position: GameVec3;
} | {
    type: "player:stop";
} | {
    type: "player:walkTo";
    position: GameVec3;
} | {
    type: "inventory:toggle";
} | {
    type: "inventory:pickup";
    itemId: string;
} | {
    type: "inventory:drop";
    itemId: string;
    slotIndex: number;
} | {
    type: "dialog:trigger";
    dialogKey: string;
} | {
    type: "dialog:dismiss";
} | {
    type: "transition:activate";
    transitionId: string;
} | {
    type: "transition:cancel";
    transitionId: string;
} | {
    type: "audio:playSfx";
    soundUrl: string;
    category?: SoundCategory;
    volume?: number;
} | {
    type: "audio:setMuted";
    target: AudioMuteTarget;
    muted: boolean;
} | {
    type: "audio:setVolume";
    target: AudioMuteTarget;
    volume: number;
} | {
    type: "i18n:setLocale";
    locale: Locale;
} | {
    type: "i18n:registerDictionary";
    locale: Locale;
    dict: DialogDictionary;
} | {
    type: "net:join";
    room: string;
    displayName?: string;
} | {
    type: "net:leave";
} | {
    type: "net:setName";
    displayName: string;
};
export type GameCommandType = GameCommand["type"];
export {};
//# sourceMappingURL=types.d.ts.map