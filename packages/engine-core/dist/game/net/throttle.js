/**
 * Throttle con trailing: ejecuta `fn` como mucho 1 vez por `ms`, pero garantiza
 * que la ÚLTIMA llamada dentro de la ventana se ejecuta (con el estado final).
 */
export function throttleTrailing(fn, ms, clock) {
    let lastRun = -Infinity;
    let scheduled = false;
    return () => {
        const t = clock.now();
        const elapsed = t - lastRun;
        if (elapsed >= ms) {
            lastRun = t;
            fn();
            return;
        }
        if (!scheduled) {
            scheduled = true;
            clock.schedule(() => {
                scheduled = false;
                lastRun = clock.now();
                fn();
            }, ms - elapsed);
        }
    };
}
//# sourceMappingURL=throttle.js.map