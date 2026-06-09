/**
 * Buffer de acciones optimistas pendientes de confirmación. Cada acción aporta
 * su propio `rollback` (cómo deshacerla). Reconciliación determinista.
 */
export function createOptimisticReconciler() {
    const pending = new Map();
    return {
        /** Registra una predicción local ya aplicada. */
        track(entityId, rollback) {
            pending.set(entityId, { entityId, rollback });
        },
        /** El servidor confirmó: descarta la predicción (no revierte). */
        confirm(entityId) {
            pending.delete(entityId);
        },
        /** El servidor rechazó: revierte y descarta. */
        reject(entityId) {
            const p = pending.get(entityId);
            if (p) {
                p.rollback();
                pending.delete(entityId);
            }
        },
        /** Reconexión: revierte TODO lo no confirmado antes de aplicar el snapshot. */
        onSnapshot() {
            pending.forEach((p) => p.rollback());
            pending.clear();
        },
        size() {
            return pending.size;
        },
    };
}
//# sourceMappingURL=optimistic.js.map