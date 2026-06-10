import type { PlayerId } from "../../ports/multiplayer";
export interface ItemClaim {
    entityId: string;
    by: PlayerId;
    ts: number;
}
export interface ClaimResult {
    entityId: string;
    by: PlayerId;
    granted: boolean;
}
/**
 * Resuelve un conjunto de claims sobre el MISMO entityId (orden de llegada irrelevante).
 * Gana el de menor ts (first-writer-wins); empate → menor playerId. Determinista.
 */
export declare function resolveClaim(claims: ItemClaim[]): ClaimResult[];
//# sourceMappingURL=claims.d.ts.map