/** Reloj/scheduler inyectable para el throttle (permite tests deterministas). */
export interface ThrottleClock {
    now: () => number;
    schedule: (cb: () => void, delay: number) => void;
}
/**
 * Throttle con trailing: ejecuta `fn` como mucho 1 vez por `ms`, pero garantiza
 * que la ÚLTIMA llamada dentro de la ventana se ejecuta (con el estado final).
 */
export declare function throttleTrailing(fn: () => void, ms: number, clock: ThrottleClock): () => void;
//# sourceMappingURL=throttle.d.ts.map