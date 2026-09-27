# Vista 3D en la modal de pasos

Rama: `feat/step-modal-preview` (desde `develop` en `b9b6ecf`).

## Qué se quiere

En `StepModal`, cuando el paso es de **Posición** o **Rotación**, enseñar la parrilla izquierda en
3D donde quedaría con el valor que se está escribiendo. Temperatura y Espera no cambian.

## Diseño propuesto

- **La pose sale del simulador, no del número a secas.** El paso se simula detrás de los anteriores
  con `planSimulation()`: así un relativo se suma al punto de partida, se recorta a 0-100, respeta
  el suelo de la inclinación que dejaron los pasos de antes, y una rotación enseña la altura a la
  que vuelve tras el seguro. Pasos anteriores: todos al añadir; los de antes del editado al editar.
- **Mismo punto de partida que el simulador de la página.** Hoy su estado (`startDraft`) vive
  dentro de `ProgramSimulator`; sube a `ProgramForm` para que la modal y el simulador partan igual.
- **Solo la pose final**, sin fantasma de la anterior.
- **Debajo, en texto:** "Quedará en 45 % · 90°" y, si aplica, el aviso de recorte o de suelo (los
  mismos textos que la lista del simulador), y en rotación "Sube al 60 % para girar".
- **Canvas compartido:** la modal monta su hueco encima del de la página y se queda el canvas
  mientras está abierta, igual que `GrillPositionModal`. Sin segundo `<Canvas>`.
- **Solo mirar, no arrastrar** (ver pregunta 2).

## Tareas

### 1. Subir el punto de partida del simulador a `ProgramForm` ✅
- `src/app/programs/hooks/useSimulationStart.ts` (nuevo): `startDraft`, `setStartDraft` y el
  `start` resultante (altura tecleada en relativo, si no la real; giro real), sacado tal cual de
  `ProgramSimulator`.
- `ProgramSimulator` recibe `start`, `startDraft` y `setStartDraft` por props; `ProgramForm` llama
  al hook. Sin cambio visible.
- Commit: `refactor: let the program form own the simulator's starting point`
- Verificación: `npm run lint`, `npm run typecheck`; en `/programs/create`, el input de partida y
  el botón "Altura actual" funcionan igual.

### 2. Una rotación de 356° o más se guarda como 0° ✅
- En `StepModal`, al escribir la rotación, un valor `>= 356` pasa a `0`. `handleStepSubmit` en
  `ProgramForm` deja de aceptar 360 (el firmware rechaza `>= 360`).
- Commit: `fix: turn a step rotation of 356 degrees or more into 0`
- Verificación: `npm run lint`, `npm run typecheck`; en la modal, escribir 355, 356, 359 y 360.

### 3. Vista 3D en la modal de pasos ✅
- `utils/programSimulation.ts`: `stepNotice()` se mueve aquí desde `ProgramSimulator` para que la
  usen los dos.
- `StepPreview` (nuevo) pinta la vista; `StepModal` recibe los pasos anteriores y `start`; con `stepForm` válido construye el paso,
  simula `[...anteriores, paso]` y pinta `SimulatorScene` con la pose final más
  el texto de la pose y los avisos. Solo para `position` y `rotation`; con el input vacío o
  inválido, la parrilla se queda en la pose anterior.
- `ProgramForm` pasa `steps.slice(0, editingStep ?? steps.length)` y `start`.
- Commit: `feat: preview a position or rotation step on the 3d grill before adding it`
- Verificación: `npm run lint`, `npm run typecheck`; en el navegador: añadir posición (absoluta y
  relativa), rotación desde abajo (sube y vuelve), editar un paso del medio, cerrar la modal y ver
  que el simulador de la página recupera el canvas. Captura.

### 4. Documentación ✅
- `GaztaindiGrill-NextJS/CLAUDE.md`: la vista de la modal de pasos junto al simulador.
- Commit: `docs: describe the 3d preview in the step modal`
- Verificación: `/docs-sync`.

## Decisiones cerradas

1. Solo la pose final, sin fantasma.
2. Sin arrastrar: solo mirar.
3. Rotación: `>= 356` se convierte en `0` (tarea 2).
