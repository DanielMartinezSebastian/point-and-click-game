export interface PendingAction {
  entityId: string;
  rollback: () => void;
}

/**
 * Buffer de acciones optimistas pendientes de confirmación. Cada acción aporta
 * su propio `rollback` (cómo deshacerla). Reconciliación determinista.
 */
export function createOptimisticReconciler() {
  const pending = new Map<string, PendingAction>();
  return {
    /** Registra una predicción local ya aplicada. */
    track(entityId: string, rollback: () => void): void {
      pending.set(entityId, { entityId, rollback });
    },
    /** El servidor confirmó: descarta la predicción (no revierte). */
    confirm(entityId: string): void {
      pending.delete(entityId);
    },
    /** El servidor rechazó: revierte y descarta. */
    reject(entityId: string): void {
      const p = pending.get(entityId);
      if (p) {
        p.rollback();
        pending.delete(entityId);
      }
    },
    /** Reconexión: revierte TODO lo no confirmado antes de aplicar el snapshot. */
    onSnapshot(): void {
      pending.forEach((p) => p.rollback());
      pending.clear();
    },
    size(): number {
      return pending.size;
    },
  };
}

export type OptimisticReconciler = ReturnType<typeof createOptimisticReconciler>;
