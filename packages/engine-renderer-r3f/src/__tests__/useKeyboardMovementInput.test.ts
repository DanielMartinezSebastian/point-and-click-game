import { describe, it, expect } from "vitest";

// Pure state-machine logic extracted from useKeyboardMovementInput for unit testing.

const MOVEMENT_KEYS = new Set([
  "arrowleft", "arrowright", "arrowup", "arrowdown",
  "a", "d", "w", "s",
]);

function buildMovementState(pressed: Set<string>) {
  const moveLeft = pressed.has("arrowleft") || pressed.has("a");
  const moveRight = pressed.has("arrowright") || pressed.has("d");
  const moveUp = pressed.has("arrowup") || pressed.has("w");
  const moveDown = pressed.has("arrowdown") || pressed.has("s");
  return { moveLeft, moveRight, moveUp, moveDown, anyKeyPressed: moveLeft || moveRight || moveUp || moveDown };
}

describe("useKeyboardMovementInput — state logic", () => {
  it("ninguna tecla → todo false", () => {
    const state = buildMovementState(new Set());
    expect(state.anyKeyPressed).toBe(false);
    expect(state.moveLeft).toBe(false);
    expect(state.moveRight).toBe(false);
    expect(state.moveUp).toBe(false);
    expect(state.moveDown).toBe(false);
  });

  it("'w' → moveUp true", () => {
    expect(buildMovementState(new Set(["w"])).moveUp).toBe(true);
  });

  it("'arrowup' → moveUp true", () => {
    expect(buildMovementState(new Set(["arrowup"])).moveUp).toBe(true);
  });

  it("'s' → moveDown true", () => {
    expect(buildMovementState(new Set(["s"])).moveDown).toBe(true);
  });

  it("'arrowdown' → moveDown true", () => {
    expect(buildMovementState(new Set(["arrowdown"])).moveDown).toBe(true);
  });

  it("'a' → moveLeft true", () => {
    expect(buildMovementState(new Set(["a"])).moveLeft).toBe(true);
  });

  it("'arrowleft' → moveLeft true", () => {
    expect(buildMovementState(new Set(["arrowleft"])).moveLeft).toBe(true);
  });

  it("'d' → moveRight true", () => {
    expect(buildMovementState(new Set(["d"])).moveRight).toBe(true);
  });

  it("'arrowright' → moveRight true", () => {
    expect(buildMovementState(new Set(["arrowright"])).moveRight).toBe(true);
  });

  it("combinación de teclas — anyKeyPressed true con cualquiera", () => {
    expect(buildMovementState(new Set(["w", "d"])).anyKeyPressed).toBe(true);
  });

  it("teclas no de movimiento (Enter, Space) no afectan el estado", () => {
    const state = buildMovementState(new Set(["enter", "space"]));
    expect(state.anyKeyPressed).toBe(false);
  });

  it("solo teclas en MOVEMENT_KEYS son de movimiento", () => {
    const nonMovement = ["enter", "escape", "tab", "shift", "control", "meta"];
    for (const key of nonMovement) {
      expect(MOVEMENT_KEYS.has(key)).toBe(false);
    }
  });

  it("soltar tecla (borrar del Set) devuelve estado limpio", () => {
    const pressed = new Set(["w"]);
    expect(buildMovementState(pressed).moveUp).toBe(true);
    pressed.delete("w");
    expect(buildMovementState(pressed).moveUp).toBe(false);
  });
});
