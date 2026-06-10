/** HLC: combina reloj físico y contador lógico → orden total sin sincronizar relojes. */
const COUNTER_BITS = 12; // hasta 4096 eventos por ms
const COUNTER_MASK = (1 << COUNTER_BITS) - 1;

export class Hlc {
  private lastPhysical = 0;
  private counter = 0;

  /** Devuelve un timestamp codificado (number) monótono creciente. */
  now(wall: number = Date.now()): number {
    if (wall > this.lastPhysical) {
      this.lastPhysical = wall;
      this.counter = 0;
    } else {
      this.counter = (this.counter + 1) & COUNTER_MASK;
    }
    return this.lastPhysical * (COUNTER_MASK + 1) + this.counter;
  }

  /** Actualiza el reloj al recibir un ts remoto (mantiene la causalidad). */
  update(remoteTs: number, wall: number = Date.now()): number {
    const remotePhysical = Math.floor(remoteTs / (COUNTER_MASK + 1));
    this.lastPhysical = Math.max(this.lastPhysical, remotePhysical, wall);
    this.counter = (this.counter + 1) & COUNTER_MASK;
    return this.lastPhysical * (COUNTER_MASK + 1) + this.counter;
  }
}
