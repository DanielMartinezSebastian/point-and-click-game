import type { PlayerId } from "../../ports/multiplayer";
export interface LwwRegister<V = unknown> {
    value: V;
    ts: number;
    by: PlayerId;
}
/** Mapa de registros LWW por `${entityId}:${field}`. Determinista entre clientes. */
export declare class WorldStateLww {
    private map;
    private key;
    get<V>(entityId: string, field: string): V | undefined;
    /** Aplica un registro remoto/local. Devuelve true si ganó (cambió el estado). */
    merge(entityId: string, field: string, reg: LwwRegister): boolean;
    snapshot(): Record<string, LwwRegister>;
    load(snap: Record<string, LwwRegister>): void;
}
//# sourceMappingURL=worldState.d.ts.map