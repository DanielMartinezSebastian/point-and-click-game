import { describe, it, expect } from "vitest";
import { createRoomSession, MAX_PLAYERS } from "../roomSession";
import { generateRoomCode, isValidRoomCode } from "../roomCode";
import { NoopStorageAdapter } from "../../platform-web";

describe("roomSession", () => {
  it("generates valid codes without ambiguous chars", () => {
    const c = generateRoomCode(() => 0);
    expect(isValidRoomCode(c)).toBe(true);
    expect(c).not.toMatch(/[0O1I]/);
  });
  it("create persists and restore returns it", () => {
    const s1 = new NoopStorageAdapter();
    const a = createRoomSession(s1);
    const code = a.create();
    const b = createRoomSession(s1);
    expect(b.restore()).toBe(code);
  });
  it("reset produces a fresh code", () => {
    let calls = 0;
    // rng determinista que cambia entre llamadas para garantizar códigos distintos
    const rng = () => {
      calls += 1;
      return (calls % 31) / 31;
    };
    const s = createRoomSession(new NoopStorageAdapter(), rng);
    const first = s.create();
    const second = s.reset();
    expect(second).not.toBe(first);
  });
  it("capacity helpers reflect N/4", () => {
    const s = createRoomSession(new NoopStorageAdapter());
    expect(s.freeSlots(0)).toBe(MAX_PLAYERS - 1); // solo yo → 3 libres
    expect(s.isFull(3)).toBe(true); // 3 remotos + yo = 4
  });
  it("join rejects invalid codes", () => {
    const s = createRoomSession(new NoopStorageAdapter());
    expect(() => s.join("xx")).toThrow();
  });
  it("forget clears persisted code", () => {
    const storage = new NoopStorageAdapter();
    const s = createRoomSession(storage);
    s.create();
    s.forget();
    expect(createRoomSession(storage).restore()).toBeNull();
  });
});
