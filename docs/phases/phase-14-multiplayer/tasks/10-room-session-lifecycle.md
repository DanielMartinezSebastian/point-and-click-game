# Task 10-room-session-lifecycle

**Effort**: 1.5 days | **Blocks**: 11 | **Blocked by**: 01,03,08

---

## 🎯 Objetivo

Implementar el ciclo de vida de **room/partida** según las decisiones tomadas: código de room
compartible, join por código, persistencia del código en el cliente (localStorage), juego en
solitario con aviso de plazas libres, reset a una room nueva, y límite de **4 jugadores**.

> El core sigue agnóstico: la persistencia en localStorage es un **platform adapter** del app
> (no entra en `engine-core`). PartyKit hace de autoridad y aplica el límite de capacidad.

---

## ✅ Success Criteria

- [ ] **Código de room** generado (corto, compartible, p.ej. 6 chars) al crear partida
- [ ] **Join por código**: introducir un código une a esa room si existe y no está llena
- [ ] **Persistencia en localStorage** (app, no core): el último código se guarda y se reusa por defecto al volver
- [ ] **Solo play**: una room con 1 jugador funciona; el world es operativo en solitario
- [ ] **Aviso de plazas**: UI muestra `N/4` jugadores y advierte cuando faltan players
- [ ] **Reset room**: acción que genera una room nueva (vacía) y deja al jugador solo hasta que entre otro
- [ ] **Capacidad 4**: el 5º intento de join se rechaza con `ConnectionStatus { state: "disconnected", reason: "room-full" }`
- [ ] Reconexión: al reabrir con el código guardado, se reentra a la misma room (estado world intacto si sigue viva)

---

## 📝 Instructions

### Step 1: PartyKit room (autoridad + capacidad)
El servidor PartyKit usa el código como `room id`. Mantiene el estado `world` en memoria
(efímero por room, ver decisión 2) y aplica el cap de 4: rechaza conexiones por encima del
límite con un status `room-full`. Expone presence count.

### Step 2: Room code + join
`generateRoomCode()` (legible, sin caracteres ambiguos). Flujo de la app: "Crear partida"
(genera código) / "Unirse" (introduce código). El código viaja en `connect({ room })` del
`MultiplayerPort`.

### Step 3: Persistencia local (platform adapter)
En el app/demo (`app/lib/platform-web.ts` o similar), guardar el último `roomCode` en
localStorage y precargarlo al arrancar. **No tocar engine-core** (Regla de Oro). Al reabrir, si
hay código guardado → reentrar; permitir "salir/olvidar" para empezar limpio.

### Step 4: Solo play, aviso y reset
La sesión funciona con 1 jugador (el world es operativo en solitario). Derivar `N/4` de la
presence y mostrar aviso de plazas libres. "Reset room" = desconectar + `generateRoomCode()`
nuevo + reconectar a la room vacía. Documentar qué pasa con el world al resetear (nuevo = limpio).

### Step 5: Testing
`__tests__/roomLifecycle.test.ts` (lógica testeable sin red, con `InMemoryHub`): capacidad 4
rechaza el 5º; solo-play opera el world; reset arranca world limpio. La persistencia localStorage
se valida en el smoke test de la demo (task 11).

---

## 📚 References
- Decisiones de la fase: `docs/phases/phase-14-multiplayer/README.md` §Decisiones tomadas
- `docs/architecture/09-multiplayer.md` §6 (room/session model) + §4 (autoridad PartyKit)
- `apps/web-demo/app/lib/platform-web.ts` (patrón de platform adapter para localStorage)
- task 08 (PartyKit adapter), task 03 (PlayerDescriptor: displayName/characterId)
