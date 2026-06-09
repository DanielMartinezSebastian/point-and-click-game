# Multiplayer — Runbook dev + prod (Vercel)

El motor es agnóstico del transporte; el realtime corre en **PartyKit** (Cloudflare), no en
Vercel. Vercel solo sirve la app Next.js. El cliente apunta a PartyKit vía
`NEXT_PUBLIC_PARTYKIT_HOST` (inlined en build).

## Variables de entorno

| Var | Dev | Prod (Vercel) |
|-----|-----|---------------|
| `NEXT_PUBLIC_PARTYKIT_HOST` | `127.0.0.1:1999` (default si no se define) | `<name>.<user>.partykit.dev` |

> ⚠️ `NEXT_PUBLIC_*` se inyecta en **build time**. Debe estar configurada en Vercel **antes** de
> compilar, o el cliente caerá al fallback `127.0.0.1:1999` y no conectará en producción.

## Dev (local)

```bash
# Terminal 1 — servidor realtime
npm run party:dev -w apps/web-demo        # PartyKit en http://127.0.0.1:1999

# Terminal 2 — Next.js
npm run dev -w apps/web-demo               # http://localhost:3000
```

Abre `http://localhost:3000/multiplayer` en dos pestañas → **Crear partida** en una, copia el
código, **Unirse** en la otra. Verás el avatar del otro moverse en la misma escena.

✅ Verificado 2026-06-10: room `FK4CFY` creada, WS `GET /parties/multiplayer/FK4CFY 101 Switching
Protocols`, lobby `1/4` + nombre aleatorio + reset.

## Prod (Vercel + PartyKit)

### 1. Desplegar el servidor PartyKit (una vez + en cada cambio de `party/`)

```bash
cd apps/web-demo
npx partykit login            # primera vez (cuenta PartyKit/GitHub)
npx partykit deploy           # usa partykit.json → name: "pointclick-multiplayer"
# → URL: https://pointclick-multiplayer.<tu-usuario>.partykit.dev
```

### 2. Configurar Vercel

- Project → Settings → **Environment Variables**:
  `NEXT_PUBLIC_PARTYKIT_HOST = pointclick-multiplayer.<tu-usuario>.partykit.dev`
  (sin `https://`, sin barra final). Aplícala a Production (y Preview si quieres).
- **Root Directory**: `apps/web-demo` (monorepo).
- Re-deploy para que el valor se inyecte en el bundle.

### 3. Verificar

- `https://<tu-app>.vercel.app/multiplayer` en dos pestañas/dispositivos.
- `partysocket` usa **wss** automáticamente para hosts no-localhost.
- Logs del server: PartyKit dashboard o `npx partykit tail`.

## Notas

- El **límite de 4 jugadores** lo aplica el servidor (`party/multiplayer.ts`); el 5º recibe
  `room-full`.
- Estado world **efímero** en memoria de la room (no persiste entre redeploys del DO). Persistencia
  server-side = 2ª iteración.
- `next build` verificado EXIT 0 con `/multiplayer` como ruta estática (Vercel-ready).
- Bug conocido: `partykit dev` en **Windows** falla en versiones < 0.0.115 (`ERR_INVALID_URL`);
  usa `partykit@^0.0.115`.
