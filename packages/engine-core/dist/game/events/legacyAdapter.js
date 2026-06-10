/**
 * Mapea un RuntimeEvent legacy (onMove/onCollide/onDrop/onDialog)
 * al nuevo GameEvent equivalente. Permite mantener el callback
 * `onRuntimeEvent` mientras el bus es la fuente de verdad.
 */
export function legacyRuntimeEventToGameEvent(ev) {
    switch (ev.type) {
        case "onMove":
            return { type: "player:moved", position: ev.position, action: ev.action };
        case "onCollide":
            return {
                type: "player:collided",
                reason: ev.reason,
                position: ev.position,
            };
        case "onDrop":
            return {
                type: "item:dropped",
                itemId: ev.itemId,
                outcome: ev.outcome,
                interactionId: ev.interactionId,
                ...(ev.placedItem ? { placedItem: ev.placedItem } : {}),
            };
        case "onDialog":
            return {
                type: "dialog:triggered",
                text: ev.text,
                dialogKey: ev.dialogKey,
                source: ev.source,
            };
    }
}
/**
 * Inverso: GameEvent → RuntimeEvent (solo los 4 legacy soportados).
 * Retorna null para eventos sin equivalente legacy (ej. scene:changed).
 */
export function gameEventToLegacyRuntimeEvent(ev) {
    switch (ev.type) {
        case "player:moved":
            return { type: "onMove", position: ev.position, action: ev.action };
        case "player:collided":
            return { type: "onCollide", reason: ev.reason, position: ev.position };
        case "item:dropped":
            return {
                type: "onDrop",
                itemId: ev.itemId,
                outcome: ev.outcome,
                interactionId: ev.interactionId,
            };
        case "dialog:triggered":
            return {
                type: "onDialog",
                text: ev.text,
                dialogKey: ev.dialogKey,
                source: ev.source,
            };
        default:
            return null;
    }
}
//# sourceMappingURL=legacyAdapter.js.map