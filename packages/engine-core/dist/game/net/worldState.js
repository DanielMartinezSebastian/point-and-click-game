/** Mapa de registros LWW por `${entityId}:${field}`. Determinista entre clientes. */
export class WorldStateLww {
    constructor() {
        this.map = new Map();
        this.key = (entityId, field) => `${entityId}:${field}`;
    }
    get(entityId, field) {
        return this.map.get(this.key(entityId, field))?.value;
    }
    /** Aplica un registro remoto/local. Devuelve true si ganó (cambió el estado). */
    merge(entityId, field, reg) {
        const k = this.key(entityId, field);
        const cur = this.map.get(k);
        // Gana mayor ts; empate → mayor playerId (criterio estable arbitrario).
        if (!cur || reg.ts > cur.ts || (reg.ts === cur.ts && reg.by > cur.by)) {
            this.map.set(k, reg);
            return true;
        }
        return false;
    }
    snapshot() {
        return Object.fromEntries(this.map);
    }
    load(snap) {
        this.map = new Map(Object.entries(snap));
    }
}
//# sourceMappingURL=worldState.js.map