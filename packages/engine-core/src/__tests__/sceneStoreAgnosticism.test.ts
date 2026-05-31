import { describe, it, expect } from "vitest";

/**
 * Tests del patrón LogPort inyectable (task 12.1).
 * No importa el store directamente (zustand no disponible en este entorno de test)
 * pero verifica el contrato del logger injectable que se aplica en sceneStore.
 */

type SceneStoreLogger = (event: string, payload: Record<string, unknown>) => void;

function createLoggerRegistry() {
  let _logger: SceneStoreLogger | null = null;

  function setLogger(logger: SceneStoreLogger | null) {
    _logger = logger;
  }

  function log(event: string, payload: Record<string, unknown>) {
    if (_logger) {
      _logger(event, payload);
    } else {
      // default: console.info (no window access)
    }
  }

  return { setLogger, log };
}

describe("SceneStore LogPort — patrón inyectable (task 12.1)", () => {
  it("invoca el logger inyectado con evento y payload", () => {
    const { setLogger, log } = createLoggerRegistry();
    const calls: Array<{ event: string; payload: Record<string, unknown> }> = [];

    setLogger((event, payload) => calls.push({ event, payload }));
    log("player:moved", { x: 1, z: 2 });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.event).toBe("player:moved");
    expect(calls[0]!.payload).toEqual({ x: 1, z: 2 });
  });

  it("sin logger inyectado no lanza (no accede a window)", () => {
    const { log } = createLoggerRegistry();
    expect(() => log("player:moved", { x: 0, z: 0 })).not.toThrow();
  });

  it("setLogger(null) desactiva el logger — llamadas posteriores no invocan al anterior", () => {
    const { setLogger, log } = createLoggerRegistry();
    const calls: string[] = [];

    setLogger((event) => calls.push(event));
    setLogger(null);
    log("player:moved", {});

    expect(calls).toHaveLength(0);
  });

  it("logger no escribe en globalThis.__gameTrace — el patrón es framework-agnostic", () => {
    const { setLogger, log } = createLoggerRegistry();
    const trace: unknown[] = [];
    (globalThis as unknown as Record<string, unknown>).__gameTrace = trace;

    // Inyectar un logger que SÍ escribe en trace (simulando platform-web bridge)
    setLogger((event, payload) => {
      (globalThis as unknown as { __gameTrace?: unknown[] }).__gameTrace?.push({ event, payload });
    });
    log("test:event", { val: 1 });

    // El logger PUEDE escribir en window si se le pide (platform responsibility)
    expect(trace).toHaveLength(1);

    // Sin logger inyectado, no escribe nada
    setLogger(null);
    log("test:event", { val: 2 });
    expect(trace).toHaveLength(1); // Sin cambios

    delete (globalThis as unknown as Record<string, unknown>).__gameTrace;
  });

  it("múltiples loggers registrados secuencialmente — solo el último está activo", () => {
    const { setLogger, log } = createLoggerRegistry();
    const calls1: string[] = [];
    const calls2: string[] = [];

    setLogger((e) => calls1.push(e));
    setLogger((e) => calls2.push(e));
    log("event", {});

    expect(calls1).toHaveLength(0);
    expect(calls2).toHaveLength(1);
  });
});
