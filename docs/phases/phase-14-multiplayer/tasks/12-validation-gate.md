# Task 12-validation-gate

**Effort**: 1 day | **Blocks**: — | **Blocked by**: 11 (05,09 para escenarios D)

---

## 🎯 Objetivo

Cerrar la fase: verificar los escenarios del owner en `/multiplayer` con dos pestañas, confirmar
que no hay regresión single-player ni rotura del agnosticismo del core, y escribir el reporte.

---

## 📁 Archivos

- **CREAR** `docs/phases/phase-14-multiplayer/validation-report.md`
- **EDITAR** `docs/phases/phase-14-multiplayer/tracking.md` (marcar checks)

---

## ✅ Success Criteria (gate)

- [ ] `npm test` (todos los workspaces) verde
- [ ] `npm run build` (todos los workspaces) compila
- [ ] Test de agnosticismo del core verde: `engine-core` no importa `window`/red/`apps/`
- [ ] `/` (single-player) idéntico al de antes (humo manual)
- [ ] Escenarios A–E verificados (abajo) y registrados en `validation-report.md`

---

## 📝 Step 1 — Test de agnosticismo del core

Crea/extiende `packages/engine-core/src/__tests__/agnosticism.test.ts` (si no existe) que recorre
los fuentes de `game/net/**` y `ports/multiplayer.ts` y falla si encuentran `window`,
`document`, `WebSocket`, `localStorage`, `partysocket`, o imports a `apps/`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [/\bwindow\b/, /\bdocument\b/, /WebSocket/, /localStorage/, /partysocket/, /from ["']\.\.\/\.\.\/\.\.\/apps/];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}

describe("core agnosticism (net)", () => {
  it("game/net and ports/multiplayer never touch the network or window", () => {
    const files = [...walk("src/game/net"), "src/ports/multiplayer.ts", "src/ports/headlessMultiplayer.ts"];
    for (const f of files) {
      const code = readFileSync(f, "utf8");
      for (const re of FORBIDDEN) expect(re.test(code), `${f} matched ${re}`).toBe(false);
    }
  });
});
```

## 📝 Step 2 — Escenarios manuales (dos pestañas)

Levanta `npm run party:dev` + `npm run dev`. Abre `/multiplayer` en dos pestañas (P1, P2).

| # | Escenario | Pasos | Esperado |
|---|-----------|-------|----------|
| A | Presence por escena | P1 crea room, P2 se une. Ambos en la misma escena; luego P2 cambia de escena | Se ven solo en la misma escena; al separarse, el avatar desaparece |
| B | Puerta world | P1 abre una puerta | P2 ve la puerta abierta (best-effort vía re-emit; ver nota task 11) |
| C | Llave private↔world | P1 recoge una llave; luego la suelta en zona permitida | P2 deja de verla al recogerla; reaparece al soltarla (requiere claim/item sync, 2ª iteración) |
| D | Claim concurrente | P1 y P2 intentan el mismo ítem a la vez | Un único ganador; el otro hace rollback (tasks 05/09) |
| E | Room lifecycle | Crear → copiar código → unir; `N/4`; Reset; 5º cliente | `N/4` correcto; reset arranca room nueva; 5º recibe `room-full` |

> A y E son **must-have** del MVP. B/C/D dependen de la 2ª iteración (item/claim sync) y pueden
> registrarse como "parcial / pendiente" si se entrega solo el MVP.

## 📝 Step 3 — Reporte

Escribe `validation-report.md` con: comandos ejecutados, resultado de A–E (✅/⚠️/❌ + nota),
capturas opcionales, y lista de issues conocidos. Marca los checks en `tracking.md`.

## ✅ Verificación
Gate verde = tests + build + agnosticismo + escenarios A/E ✅. Usa la skill `run-web-demo` para
levantar el server.

## 📚 References
- `docs/phases/phase-8-scene-transitions/` (formato de validation-report)
- skill `run-web-demo`
- tasks 04–11
