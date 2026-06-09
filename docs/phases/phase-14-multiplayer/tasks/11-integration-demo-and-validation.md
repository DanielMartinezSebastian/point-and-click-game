# Task 11-integration-demo-and-validation

**Effort**: 1.5 days | **Blocks**: — | **Blocked by**: 04,06,07,08,10 (05,09 para validación completa)

---

## 🎯 Objetivo

Cablear todo en la demo, verificar los escenarios del owner con dos pestañas/navegadores, y
cerrar el gate de validación de la fase.

---

## ✅ Success Criteria

- [ ] `app/lib/net/createMultiplayerRuntime.ts`: crea runtime + `MultiplayerSession` + adapter inyectable
- [ ] Demo conecta a un room; un toggle/URL param activa multiplayer (off = single-player intacto)
- [ ] **Escenario A (presence por escena)**: dos pestañas se ven SOLO en la misma escena
- [ ] **Escenario B (puerta world)**: A abre puerta → B la ve abierta
- [ ] **Escenario C (llave private↔world)**: A recoge llave → B no la ve; A la suelta en zona permitida → B la ve
- [ ] **Escenario D (claim)**: dos a la vez sobre el mismo ítem → un único ganador, el otro rollback
- [ ] **Escenario E (room lifecycle)**: crear room → compartir código → 2º jugador se une; solo-play con aviso `N/4`; reset a room nueva; 5º join rechazado (`room-full`)
- [ ] Gate: test de agnosticismo del core verde; suite single-player sin regresión; build OK
- [ ] `validation-report.md` con resultados de los 4 escenarios

---

## 📝 Instructions

### Step 1: Wiring demo
`createMultiplayerRuntime` recibe el adapter (PartyKit dev) y monta la session. Renderiza
`RemotePlayers` dentro del canvas. Activable por flag.

### Step 2: Validación manual two-tab
Abre dos pestañas (o dos navegadores) en la misma room. Ejecuta los escenarios A–D y registra
resultados. Usa la skill `run-web-demo` para levantar el server.

### Step 3: Gates automáticos
`npm test` (incl. tests de tasks 01–09). Test de agnosticismo del core. Confirmar que sin
adapter el juego arranca single-player idéntico.

### Step 4: Reporte
Escribe `docs/phases/phase-14-multiplayer/validation-report.md` (mismo formato que fases
anteriores) y marca todos los checks en `tracking.md`.

---

## 📚 References
- `docs/phases/phase-8-scene-transitions/` (formato de validation-report)
- skill `run-web-demo`
- `apps/web-demo/app/example-bridge/` (patrón de integración externa del runtime)
