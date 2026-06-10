/**
 * MultiplayerPort – contrato agnóstico de transporte multijugador.
 *
 * El core SOLO habla con esta interfaz. Los adapters (PartyKit, headless, …) la
 * implementan fuera del core. Ningún import de red/`window`/proveedor aquí.
 *
 * Ver docs/architecture/09-multiplayer.md §3 y ADR-0008.
 */
/** Versión del protocolo de red. Súbela ante cambios incompatibles del sobre. */
export const NET_PROTOCOL_VERSION = 1;
//# sourceMappingURL=multiplayer.js.map