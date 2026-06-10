const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I ambiguos
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return out;
}

export function isValidRoomCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(
    code.toUpperCase(),
  );
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
