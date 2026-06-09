import type { PlayerId } from "../../ports/multiplayer";

export interface LwwRegister<V = unknown> {
  value: V;
  ts: number;
  by: PlayerId;
}

/** Mapa de registros LWW por `${entityId}:${field}`. Determinista entre clientes. */
export class WorldStateLww {
  private map = new Map<string, LwwRegister>();
  private key = (entityId: string, field: string) => `${entityId}:${field}`;

  get<V>(entityId: string, field: string): V | undefined {
    return this.map.get(this.key(entityId, field))?.value as V | undefined;
  }

  /** Aplica un registro remoto/local. Devuelve true si ganó (cambió el estado). */
  merge(entityId: string, field: string, reg: LwwRegister): boolean {
    const k = this.key(entityId, field);
    const cur = this.map.get(k);
    // Gana mayor ts; empate → mayor playerId (criterio estable arbitrario).
    if (!cur || reg.ts > cur.ts || (reg.ts === cur.ts && reg.by > cur.by)) {
      this.map.set(k, reg);
      return true;
    }
    return false;
  }

  snapshot(): Record<string, LwwRegister> {
    return Object.fromEntries(this.map);
  }
  load(snap: Record<string, LwwRegister>): void {
    this.map = new Map(Object.entries(snap));
  }
}
