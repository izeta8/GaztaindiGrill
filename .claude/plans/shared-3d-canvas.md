# Shared 3D canvas

Hoy cada `GrillScene` monta su propio `<Canvas>`: un contexto WebGL nuevo cada vez, que vuelve a
compilar los shaders, a generar el entorno a partir del HDR (1,5 MB) y a subir el modelo a la GPU.
La página además desmonta su escena mientras el modal está abierto, porque con dos lienzos a la
vez uno dejaba de repintar ([page.tsx](../../GaztaindiGrill-NextJS/src/app/control/page.tsx)). Así
que abrir el modal cuesta un lienzo nuevo, y cerrarlo, otro. Los ficheros ya salen de la caché de
drei: lo que se repite es el trabajo en la GPU.

Solo web. Branch: `feat/shared-3d-canvas`

## Decisión: mover un solo lienzo, no `<View>` de drei

`<View>` pinta varias vistas en un lienzo fijo a pantalla completa, por encima de todo. Aquí eso
choca con los modales: para que se vea la vista del modal, el lienzo tiene que estar por encima
de su fondo, y entonces la vista de la página también se pintaría encima del fondo del modal, del
modal de usuario y del overlay de reinicio. Además, el arrastre del modal escucha eventos en
`gl.domElement`, y ese lienzo tendría `pointer-events: none`.

En su lugar: **un solo `<Canvas>`, creado una vez y movido en el DOM al hueco que toca**.
- Un elemento `host` creado con `document.createElement`, en el que se renderiza el `<Canvas>`
  con `createPortal`. React nunca quita `host`, así que se puede mover con `appendChild` sin que
  React proteste.
- Cada `GrillScene` pasa a ser un hueco: pinta un `div` con su tamaño y se apunta en una pila.
  El último hueco montado se queda el lienzo: el modal se apila encima de la página, y al cerrarse
  el lienzo vuelve a la página.
- Lo que depende del hueco (`focusGrill`, `target`, `controls`, `showLabels`, `onGrillSelect`,
  `cameraPosition`) va por la pila. El contenido de la escena lleva el id del hueco como `key`, así
  que la cámara y los `OrbitControls` empiezan de cero en cada cambio. `<Stage>` y su entorno
  quedan fuera de esa `key` y no se regeneran.
- Los eventos de R3F y los listeners de `gl.domElement` van con el lienzo, porque es el mismo
  elemento.

## Tareas

### 1. Un solo lienzo compartido

- `src/components/three/SharedGrillCanvas.tsx` (nuevo): el proveedor con la pila de huecos, el
  `host` y el `<Canvas>` persistente. El lienzo no se crea hasta que se apunta el primer hueco, y
  con la pila vacía pasa a `frameloop="never"`.
- `src/components/three/GrillScene.tsx`: pasa a ser el hueco; el `<Canvas>` y el `<Stage>` se van
  al proveedor.
- `src/app/providers.tsx`: montar el proveedor, para que el lienzo sobreviva al navegar fuera de
  `/control` y volver.
- `src/app/control/page.tsx`: quitar `selectedGrill === null &&` y el comentario de los dos
  lienzos; el hueco de la página se queda montado debajo del modal.
- Commit: `feat: keep one 3d canvas alive so the modal opens without rebuilding the scene`
- Verificación: `npm run lint` y `npm run typecheck`. A mano en la tablet: la primera carga igual
  que antes, y abrir o cerrar el modal sin el "Cargando parrilla…". En el modal, el arrastre de
  altura y giro, y el encuadre de las dos parrillas. En la página, tocar una parrilla y girar el
  modelo. Navegar a `/programs/list` y volver.

### 2. Modelo más ligero para la primera carga — cambiado al implementar

En vez de meshopt: gzip en `deploy.htaccess` (1,1 MB → 130 KB, y también comprime el JS, que se
servía sin comprimir). meshopt cuantiza, y eso reescribe las transformaciones de los nodos que
`GrillModel` mueve a mano. El deploy avisa si el modelo llega sin comprimir.

Plan original:


- `public/models/parrilla_model_v5.glb` → comprimido con `gltf-transform` (meshopt + texturas
  webp). Con meshopt, porque su decodificador va dentro del bundle; Draco lo bajaría de un CDN, que
  es lo mismo que ya rompió el HDR.
- `GrillModel.tsx`: `useGLTF(url, false, true)` y el `preload` igual.
- Commit: `feat: load a compressed grill model`
- Verificación: `npm run build`, comparar tamaños, y que los nombres de nodo sigan intactos
  (`padre_parrilla_ezkerra`/`eskubi`, `rotor_cilindro+parrilla`): si no, el modelo carga pero no
  se mueve.

### 3. Entorno más pequeño (opcional, ver pregunta 2)

- `public/hdri/potsdamer_platz_1k.hdr` → versión de 256 px. El fondo no se ve, solo ilumina, así
  que la resolución apenas cambia el resultado.
- `GrillScene`/proveedor: la ruta nueva.
- Commit: `feat: light the 3d scene from a smaller environment map`
- Verificación: `npm run build` y comparar a ojo el modelo antes y después.

### 4. Docs

- `GaztaindiGrill-NextJS/CLAUDE.md`, el párrafo de "3D grill visualization": un solo lienzo que se
  mueve entre huecos, y por qué no `<View>`.
- Commit: `docs: describe the shared 3d canvas`

## Preguntas

1. **¿Te vale mover un solo lienzo?** La contrapartida es que solo se ve un 3D a la vez, que es
   justo lo que ya pasa hoy.
2. **¿Hacemos también la 2 y la 3?** La tarea 1 arregla abrir y cerrar el modal. La primera carga
   la mejoran la 2 y la 3: pasan de ~2,7 MB a bastante menos, pero la compilación de shaders se
   queda igual.
