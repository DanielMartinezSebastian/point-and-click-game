# Task 10-room-session-lifecycle

**Effort**: 1.5 days | **Blocks**: 11 | **Blocked by**: 01,03,08

---

## 🎯 Objetivo

Ciclo de vida de room según decisiones: código compartible, join por código, persistencia en
localStorage, solo-play con aviso `N/4`, reset a room nueva, límite 4. Lógica en el **app**
(platform), el core sigue agnóstico.

---

## 📁 Archivos

- **CREAR** `apps/web-demo/app/lib/net/roomCode.ts`
- **CREAR** `apps/web-demo/app/lib/net/roomCodeStorage.ts`
- **CREAR** `apps/web-demo/app/lib/net/roomSession.ts`
- **CREAR** `apps/web-demo/app/lib/net/__tests__/roomSession.test.ts`

---

## ✅ Success Criteria

- [ ] `generateRoomCode()` → 6 chars legibles (sin 0/O/1/I); `isValidRoomCode` valida
- [ ] `createRoomCodeStorage(storage)` con `load/save/clear` sobre `StoragePort`
- [ ] `createRoomSession` expone `code`, `create()`, `join(code)`, `reset()`, `capacity` (4), `count(remoteN)`
- [ ] `reset()` genera código nuevo y persiste; permite solo-play
- [ ] `MAX_PLAYERS = 4`; helper `isFull(remoteN)` y `freeSlots(remoteN)`
- [ ] Tests verdes

---

## 📝 Step 1 — `app/lib/net/roomCode.ts`

```ts
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I ambiguos
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  return out;
}
export function isValidRoomCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(code.toUpperCase());
}
export function normalizeRoomCode(code: string): string { return code.trim().toUpperCase(); }
```

## 📝 Step 2 — `app/lib/net/roomCodeStorage.ts`

```ts
import type { StoragePort } from "../platform-web";

export const ROOM_CODE_STORAGE_KEY = "pce:multiplayer:roomCode";

/** Persiste el último código de room (reutilizable al volver). */
export function createRoomCodeStorage(storage: StoragePort) {
  return {
    load: (): string | null => storage.getItem(ROOM_CODE_STORAGE_KEY),
    save: (code: string): void => storage.setItem(ROOM_CODE_STORAGE_KEY, code),
    clear: (): void => storage.removeItem(ROOM_CODE_STORAGE_KEY),
  };
}
```

## 📝 Step 3 — `app/lib/net/roomSession.ts`

```ts
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from "./roomCode";
import { createRoomCodeStorage } from "./roomCodeStorage";
import type { StoragePort } from "../platform-web";

export const MAX_PLAYERS = 4;

export interface RoomSession {
  /** Código activo (null si aún no se ha creado/unido). */
  getCode: () => string | null;
  /** Crea una room nueva (genera código), la persiste y la devuelve. */
  create: () => string;
  /** Une a un código existente (valida + persiste). Lanza si inválido. */
  join: (code: string) => string;
  /** Reset: nueva room vacía (solo-play hasta que entre alguien). */
  reset: () => string;
  /** Olvida el código persistido (empezar limpio). */
  forget: () => void;
  /** Restaura el último código guardado, si existe. */
  restore: () => string | null;
  capacity: number;
  isFull: (remoteCount: number) => boolean;
  freeSlots: (remoteCount: number) => number;
}

export function createRoomSession(storage: StoragePort, rng: () => number = Math.random): RoomSession {
  const persist = createRoomCodeStorage(storage);
  let code: string | null = null;
  const setCode = (c: string) => { code = c; persist.save(c); return c; };
  return {
    getCode: () => code,
    create: () => setCode(generateRoomCode(rng)),
    join: (raw) => {
      const c = normalizeRoomCode(raw);
      if (!isValidRoomCode(c)) throw new Error(`código inválido: ${raw}`);
      return setCode(c);
    },
    reset: () => setCode(generateRoomCode(rng)),
    forget: () => { code = null; persist.clear(); },
    restore: () => { code = persist.load(); return code; },
    capacity: MAX_PLAYERS,
    // remoteCount = otros jugadores; +1 = yo
    isFull: (remoteCount) => remoteCount + 1 >= MAX_PLAYERS,
    freeSlots: (remoteCount) => Math.max(0, MAX_PLAYERS - (remoteCount + 1)),
  };
}
```

## 📝 Step 4 — Test `app/lib/net/__tests__/roomSession.test.ts`

```ts
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
    const s = createRoomSession(new NoopStorageAdapter());
    const first = s.create();
    const second = s.reset();
    expect(second).not.toBe(first); // distinto con altísima probabilidad
  });
  it("capacity helpers reflect N/4", () => {
    const s = createRoomSession(new NoopStorageAdapter());
    expect(s.freeSlots(0)).toBe(MAX_PLAYERS - 1); // solo yo → 3 libres
    expect(s.isFull(3)).toBe(true);               // 3 remotos + yo = 4
  });
  it("join rejects invalid codes", () => {
    const s = createRoomSession(new NoopStorageAdapter());
    expect(() => s.join("xx")).toThrow();
  });
});
```

## ✅ Verificación
`npm test -w apps/web-demo` (o el runner de tests del app) verde. La capacidad real (5º →
`room-full`) la aplica el servidor PartyKit (task 08); aquí se valida la lógica de cliente.

## 📚 References
- `apps/web-demo/app/lib/platform-web.ts` (`StoragePort`, `localStorageAdapter`, `NoopStorageAdapter`)
- `docs/architecture/09-multiplayer.md` §7
- task 08 (PartyKit aplica el cap server-side)
