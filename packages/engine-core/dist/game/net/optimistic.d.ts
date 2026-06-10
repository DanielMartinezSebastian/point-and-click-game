export interface PendingAction {
    entityId: string;
    rollback: () => void;
}
/**
 * Buffer de acciones optimistas pendientes de confirmación. Cada acción aporta
 * su propio `rollback` (cómo deshacerla). Reconciliación determinista.
 */
export declare function createOptimisticReconciler(): {
    /** Registra una predicción local ya aplicada. */
    track(entityId: string, rollback: () => void): void;
    /** El servidor confirmó: descarta la predicción (no revierte). */
    confirm(entityId: string): void;
    /** El servidor rechazó: revierte y descarta. */
    reject(entityId: string): void;
    /** Reconexión: revierte TODO lo no confirmado antes de aplicar el snapshot. */
    onSnapshot(): void;
    size(): number;
};
export type OptimisticReconciler = ReturnType<typeof createOptimisticReconciler>;
//# sourceMappingURL=optimistic.d.ts.map