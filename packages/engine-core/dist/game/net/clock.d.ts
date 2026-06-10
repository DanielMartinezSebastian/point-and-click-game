export declare class Hlc {
    private lastPhysical;
    private counter;
    /** Devuelve un timestamp codificado (number) monótono creciente. */
    now(wall?: number): number;
    /** Actualiza el reloj al recibir un ts remoto (mantiene la causalidad). */
    update(remoteTs: number, wall?: number): number;
}
//# sourceMappingURL=clock.d.ts.map