# Host en runtime: un solo build que funciona por LAN y por Tailscale

Rama sugerida: `feat/runtime-host` (ahora estamos en `develop`; el cambio de rama es decisión tuya).
Árbol sucio: hay staged un `.claude/plans/user-system.md` (nuevo) y `GaztaindiGrill-API/docs/database.md` (modificado). Este plan no toca ninguno de los dos.

## El problema

Dos fallos independientes que hay que arreglar juntos, porque arreglar solo uno no deja nada funcionando.

**1. El iframe.** La tarjeta del dashboard apunta a `http://localhost:8081/control.html`. Esa URL la resuelve **el navegador**, no Home Assistant, así que `localhost` eres tú y no la HA. Solo funciona navegando desde la propia máquina de HA.

**2. El host compilado.** `.env.local` tiene `192.168.1.76` y `output: 'export'` lo hornea dentro del bundle. Por Tailscale esa IP es inalcanzable, así que aunque arregles el iframe la app se queda sin API ni MQTT.

## Comprobado contra la instalación real

No asumir otra cosa; esto está medido, no deducido.

| Comprobación | Resultado |
|---|---|
| Puertos 8000 / 1884 / 8081 / 8123 por Tailscale (`homeassistant.tailbedb82.ts.net`) | los cuatro responden |
| Los mismos por LAN (`192.168.1.76`) desde fuera de la red | ninguno |
| `homeassistant.local` (mDNS) por Tailscale | no resuelve |
| MagicDNS, sufijo `tailbedb82.ts.net` | activo en todo el tailnet |
| `config/www` en el host de HA | ya existe (`/local/` da 403 de listado, no 404) → ruta ya registrada, no hace falta reiniciar HA |
| `/local/<directorio>/` en HA | **403**. No hay índice de directorio ni rewrite |
| `/local/<fichero-inexistente>` en HA | 404 |
| Apache: rewrite del `.htaccess` e índice de directorio | funcionan |
| Apache: gzip (`mod_deflate`) | inactivo — HA tampoco comprime, así que ahí no se pierde nada |

De la fila del 403 sale una consecuencia de diseño: **el shim tiene que ser un `.html` explícito**, no un directorio.

## La solución (Opción A)

Apache2 sigue siendo quien sirve la aplicación. **No** se mueve la app a `config/www`, **no** se tocan `deploy.ps1`, `deploy.htaccess`, `basePath` ni el add-on.

El requisito irreducible es que algo viva en el origen de HA para resolver el host. Se reduce a un fichero de 6 líneas.

```
Navegador ──► HA :8123  /local/grill.html        (URL relativa: resuelve siempre)
                   │
                   └─ script: location.hostname ──► Apache :8081 /control.html
                                                          │
                                    la app lee window.location.hostname
                                                          │
                                          ├──► API   <host>:8000
                                          └──► MQTT  ws://<host>:1884
```

| Entras a HA por | El shim redirige a | La app llama a |
|---|---|---|
| `192.168.1.76:8123` | `192.168.1.76:8081/control.html` | `192.168.1.76:8000` y `:1884` |
| `homeassistant.tailbedb82.ts.net:8123` | `…ts.net:8081/control.html` | `…ts.net:8000` y `:1884` |

Un solo build cubre los dos casos porque no queda ningún host escrito en ninguna parte.

## Cómo conviven las env vars con el runtime

Solo el **host** pasa a runtime. Puertos, protocolo, usuario y contraseña siguen viniendo de env, porque no cambian según por dónde entres.

El problema real está en `npm run dev`: ahí la página la sirve el portátil, pero la API y el broker viven en la HA. Si el host saliera siempre de `window.location.hostname`, desarrollar apuntaría a `localhost` y no habría nada al otro lado.

La salida **no** puede ser "usa la env var si está puesta", porque `.env.local` está en el disco de la máquina que compila y `next build` la leería igual, volviendo a hornear `192.168.1.76`. La solución es una variable que solo exista en desarrollo:

```ts
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_HOST) {
  return process.env.NEXT_PUBLIC_DEV_HOST
}
return window.location.hostname
```

En un build de producción `NODE_ENV` es `'production'`, la rama es constante y desaparece del bundle. No hay forma de que un `.env.local` olvidado se cuele en el export.

### Trampa de prerender

`output: 'export'` prerenderiza en build, donde `window` no existe. Hoy `src/app/programs/edit/page.tsx:19` lee `process.env.NEXT_PUBLIC_API_URL` **en el cuerpo del componente**, que sí se ejecuta al prerenderizar. Si eso se sustituye por una llamada al helper sin más, `npm run build` peta con `window is not defined`.

El helper tiene que ser seguro en SSR (devolver `''` si no hay `window`) y las llamadas tienen que vivir dentro de efectos o manejadores. Por eso la tarea 2 se verifica con `npm run build`, no solo con `typecheck`.

## Limitación aceptada

Si algún día accedes a HA por HTTPS (Nabu Casa), el navegador bloqueará el iframe `http` por mixed content, y la API y el broker por lo mismo. No se resuelve ahora; queda documentado.

---

## Tareas

### 1. Resolver el host en runtime, y usarlo para MQTT

El helper y su primer consumidor. MQTT va primero porque `useMqtt.tsx` ya tiene el patrón de mirar `window.location` (deduce `ws`/`wss` del protocolo de la página), así que el helper cae en un sitio donde ya hay precedente de estilo.

- `src/utils/host.ts` nuevo, exportando `resolveHost()` y `apiBaseUrl()`. Seguro en SSR.
- Exportarlo desde el barril `src/utils/index.ts`, como el resto.
- `buildUrlAndOptions()` en `useMqtt.tsx`: el `host` sale de `resolveHost()` en vez de `NEXT_PUBLIC_MQTT_SERVER`. Puerto, protocolo, path, usuario y contraseña siguen igual. Se cae el `throw new Error('Missing NEXT_PUBLIC_MQTT_SERVER')`, que ya no puede darse.
- `useGrillCommands.tsx:92`: `isLocalhost` comparaba `NEXT_PUBLIC_MQTT_SERVER === 'localhost'`. Pasa a comparar contra `resolveHost()`. Ojo: en dev sin `NEXT_PUBLIC_DEV_HOST` el host **sí** es `localhost`, así que el modo simulación se activa igual que antes.
- Comprobar también `src/utils/mqttSimulators.ts`, que `docs/mqtt.md:276` menciona junto a la rama `isLocalhost`.

Archivos: `src/utils/host.ts`, `src/utils/index.ts`, `src/hooks/useMqtt.tsx`, `src/app/control/hooks/useGrillCommands.tsx`
Commit: `feat: connect to the broker on the host the page was served from`
Verificación: `npm run lint` y `npm run typecheck`. En navegador: cargar `http://<host>:8081/control.html` por LAN y por el nombre de Tailscale, y ver que el indicador de conexión MQTT pasa a online en ambos.

### 2. La API en el host de la página

Los siete puntos de llamada usan `${process.env.NEXT_PUBLIC_API_URL}` interpolado directamente en el `fetch`. Pasan a `apiBaseUrl()`.

- `src/app/programs/components/ProgramForm.tsx` (líneas 115 y 289)
- `src/app/programs/create/page.tsx:21`
- `src/app/programs/list/components/ProgramCard.tsx:43`
- `src/app/programs/list/page.tsx` (líneas 111 y 156)
- `src/app/programs/edit/page.tsx:19` — **el delicado**. `apiBase` se lee en el cuerpo del componente y alimenta un mensaje de error ("No se ha definido NEXT_PUBLIC_API_URL…"). Hay que moverlo dentro del efecto que lo usa, y ese mensaje ya no tiene sentido: con el host en runtime no hay nada que definir. Decidir si se cae la rama entera o si pasa a avisar de otra cosa.

Archivos: los seis de arriba
Commit: `feat: call the api on the host the page was served from`
Verificación: `npm run lint`, `npm run typecheck` y **`npm run build`** — este último es el que caza el `window is not defined` del prerender. En navegador: `/programs/list` tiene que listar programas por LAN y por Tailscale.

### 3. El shim de HA y la tarjeta del dashboard

Los dos ficheros que viven en HA pero cuya fuente de verdad tiene que estar en el repo.

`GaztaindiGrill-NextJS/homeassistant/grill.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>Gaztaindi Grill</title>
<!-- Home Assistant serves this from config/www at /local/grill.html, so the dashboard
     card can use a relative URL. The app itself stays on the Apache2 add-on: this only
     carries the host the dashboard was opened with over to port 8081. -->
<script>
  location.replace('http://' + location.hostname + ':8081/control.html')
</script>
```

`GaztaindiGrill-NextJS/homeassistant/dashboard-card.yaml` con la vista actual y solo el `url` cambiado, conservando el bloque `style` y el `aspect_ratio`:

```yaml
url: /local/grill.html
```

El despliegue es manual y de una sola vez: copiar `grill.html` a `\\homeassistant.local\config\www\`. **Nunca con robocopy `/MIR`** — `config/www` tiene más cosas y las borraría. `deploy.ps1` no se toca (ver preguntas abiertas).

Archivos: `GaztaindiGrill-NextJS/homeassistant/grill.html`, `GaztaindiGrill-NextJS/homeassistant/dashboard-card.yaml`
Commit: `feat: add the home assistant shim that forwards the dashboard host to apache`
Verificación: copiar el fichero, abrir `http://<host>:8123/local/grill.html` por LAN y por Tailscale, y comprobar que la barra de direcciones acaba en `:8081/control.html`. Luego pegar el YAML en el dashboard y ver la parrilla dentro del panel.

### 4. Dejar el contrato de env en git

`.gitignore` ignora `.env*`, así que los nombres nuevos (`NEXT_PUBLIC_DEV_HOST`, `NEXT_PUBLIC_API_PORT`) no quedarían escritos en ninguna parte del repo, y los viejos (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MQTT_SERVER`) tampoco constaría que se han caído. El propio `.gitignore` dice "can opt-in for committing if needed": este es el caso.

- `!.env.example` en `.gitignore`.
- `.env.example` nuevo, con los nombres que quedan y una línea por cada uno diciendo cuándo aplica.
- Recordatorio, **no commiteable**: actualizar tu `.env.local` a mano. `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_MQTT_SERVER` se caen; entra `NEXT_PUBLIC_DEV_HOST=homeassistant.tailbedb82.ts.net` y `NEXT_PUBLIC_API_PORT=8000`.

Archivos: `GaztaindiGrill-NextJS/.gitignore`, `GaztaindiGrill-NextJS/.env.example`
Commit: `chore: commit an env example now that the host is resolved at runtime`
Verificación: `npm run dev` sigue levantando y hablando con la HA remota; `git check-ignore .env.example` no devuelve nada.

---

## Después

`/docs-sync` cubre la documentación: `docs/api.md:7` y `docs/mqtt.md:26` describen las env vars que se caen, `docs/mqtt.md:276` la rama `isLocalhost`, y `GaztaindiGrill-NextJS/CLAUDE.md:55` la base URL. El shim y la tarjeta del dashboard son concepto nuevo y no están descritos en ningún sitio.

## Preguntas abiertas

**1. `deploy.ps1` no llega a la HA por Tailscale.** Tiene `$HaHost = 'homeassistant.local'` hardcodeado, y ese nombre es mDNS: no resuelve fuera de la LAN. Ahora mismo estás fuera, así que `npm run deploy` fallaría antes de empezar. Cambiarlo a `homeassistant.tailbedb82.ts.net` haría que funcionase desde los dos sitios con Tailscale levantado (Samba pasa por Tailscale sin problema), pero perdería el caso "en la LAN y sin Tailscale". ¿Lo cambio, lo dejo, o lo hago parámetro?

**2. ¿Automatizar la copia del shim?** Ahora es manual. Un `Copy-Item` suelto a `\\<ha>\config\www\grill.html` en `deploy.ps1` sería idempotente y sin riesgo (copia simple, jamás `/MIR`), y evitaría que el fichero del repo y el del host se separen. Dijiste de no tocar `deploy.ps1`, así que no está en las tareas.

**3. ¿Dónde viven los ficheros de HA?** He propuesto `GaztaindiGrill-NextJS/homeassistant/`, porque los dos tratan de cómo HA embebe el cliente web. La alternativa es una carpeta `homeassistant/` en la raíz del monorepo, que obligaría a añadir fila a la tabla de layout del `CLAUDE.md` raíz.

**4. El 8081 queda escrito en dos sitios**: `$WebPort` en `deploy.ps1` y el shim. Son dos ficheros que casi nunca se tocan y viven en repos distintos del host, así que probablemente sobra resolverlo — pero conviene saberlo.
