import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [
  /\bwindow\b/,
  /\bdocument\b/,
  /WebSocket/,
  /localStorage/,
  /partysocket/,
  /from ["'].*\/apps\//,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}

/** Quita comentarios para que menciones en prosa no cuenten como uso real. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments (no rompe http://)
}

describe("core agnosticism (net)", () => {
  it("game/net and ports/multiplayer never touch the network or window", () => {
    const files = [
      ...walk(join(__dirname, "..", "game", "net")),
      join(__dirname, "..", "ports", "multiplayer.ts"),
      join(__dirname, "..", "ports", "headlessMultiplayer.ts"),
    ];
    for (const f of files) {
      const code = stripComments(readFileSync(f, "utf8"));
      for (const re of FORBIDDEN) {
        expect(re.test(code), `${f} matched ${re}`).toBe(false);
      }
    }
  });
});
