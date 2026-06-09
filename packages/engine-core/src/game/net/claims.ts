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
export function resolveClaim(claims: ItemClaim[]): ClaimResult[] {
  if (claims.length === 0) return [];
  const winner = [...claims].sort((a, b) => a.ts - b.ts || (a.by < b.by ? -1 : 1))[0]!;
  return claims.map((c) => ({
    entityId: c.entityId,
    by: c.by,
    granted: c.by === winner.by,
  }));
}
