# Plan: la API dentro de Next.js

Rama: `refactor/api-into-nextjs` (sale de `develop`; árbol limpio salvo `.vscode/` sin seguimiento, que este plan no toca).

## Qué es

`GaztaindiGrill-API` existe solo porque el add-on Apache2 de Home Assistant servía ficheros
estáticos. La web pasa a correr como servidor Node en un contenedor del home lab (Proxmox), así que
el CRUD de programas, categorías y usuarios se muda a Route Handlers de Next.js y la API de Python
se borra. MariaDB y Mosquitto se quedan, de momento, en Home Assistant.

## Decisiones tomadas (edita este fichero antes de implementar si alguna no vale)

### Rutas REST bajo `/api`

| FastAPI | Next.js |
|---|---|
| `GET /programs` | `GET /api/programs` |
| `POST /programs/create` | `POST /api/programs` |
| `GET /programs/{id}` | `GET /api/programs/[id]` |
| `PATCH /programs/{id}` | `PATCH /api/programs/[id]` |
| `DELETE /programs/{id}` | `DELETE /api/programs/[id]` |
| `GET /categories` | `GET /api/categories` |
| `POST /categories/create` | `POST /api/categories` |
| `GET /users` | `GET /api/users` |
| `POST /users/create` | `POST /api/users` |

Mismo origen que la página, así que el cliente llama a `/api/...` relativo: desaparecen
`apiBaseUrl()`, `NEXT_PUBLIC_API_PORT` y el CORS. Las respuestas se quedan **idénticas**
(snake_case, mismos códigos y mensajes): las páginas no cambian más que la URL.

### Capa de datos: Drizzle ORM sobre `mysql2`

Lo estándar en Next.js hoy es un ORM con tipos (Drizzle o Prisma). Drizzle porque:
- el esquema vive en TypeScript (`src/db/schema.ts`) y las consultas salen tipadas;
- pasar a PostgreSQL más adelante es cambiar el dialecto y el esquema, no reescribir cada consulta;
- `drizzle-kit` da migraciones versionadas, que sustituyen al SQL ejecutado a mano.

Estructura:
- `src/db/index.ts` — pool de `mysql2` con `import 'server-only'`, guardado en `globalThis`
  para que el hot reload de `next dev` no abra un pool nuevo en cada cambio.
- `src/db/schema.ts` — las tres tablas, sacadas de la base real con `drizzle-kit pull`.
- `src/server/data/{programs,categories,users}.ts` — las consultas (Data Access Layer).
- `src/server/validation/*.ts` — esquemas `zod` que sustituyen a los modelos de Pydantic.
- `src/app/api/**/route.ts` — solo HTTP: validar, llamar a la capa de datos, responder.

Dos detalles que hay que mantener para no romper el cliente:
- **`steps_json` sale como string.** En MariaDB `JSON` es `LONGTEXT`; en el esquema va como texto,
  no como `json()`, porque `parseSteps()` espera un string.
- **Fechas.** FastAPI devolvía `2026-09-10T23:09:29`. Las timestamps salen en ese mismo formato
  ISO (con `T`): Safari en iPad no parsea `2026-09-10 23:09:29`.

### Config del servidor en runtime, no en el build

Lo que se hace en la industria con Docker: **una imagen, muchas máquinas**. Todo lo `NEXT_PUBLIC_*`
se hornea en el bundle durante `next build`, así que cambiar el broker obligaría a reconstruir. Se
pasa a variables de servidor (`DB_*`, `MQTT_*`) que el layout raíz lee al servir la página y le pasa
al cliente. Además el host del broker ya no puede salir de `location.hostname`: la página vendrá
del home lab y el broker sigue en Home Assistant.

### Despliegue: Docker `standalone` + Compose

`output: 'standalone'` genera un `server.js` con solo las dependencias que usa; la imagen
multi-stage final pesa ~150-200 MB en lugar de >1 GB. `compose.yaml` la arranca con un `.env`
del host. Para empezar se construye en el propio contenedor de Proxmox (`docker compose up -d --build`
tras un `git pull`). Lo habitual en la industria, en una rama aparte: GitHub Actions
construye la imagen, la sube a GHCR y el servidor solo hace `pull`.

## Tareas

### 1. Capa de datos con Drizzle
- Añadir `drizzle-orm`, `zod`, `server-only` y `drizzle-kit` (dev). `mysql2` ya está.
- `drizzle.config.ts`, `src/db/index.ts`, `src/db/schema.ts` (con `drizzle-kit pull` contra la base real, retocado a mano para `steps_json` como texto).
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en `.env.example`.
- Nadie lo usa todavía.
- **Ficheros:** `package.json`, `package-lock.json`, `drizzle.config.ts`, `src/db/*`, `.env.example`
- **Commit:** `feat: add a typed database layer for the programs database`
- **Verificación:** `npm run lint`, `npm run typecheck`, `npx drizzle-kit pull` conecta y el esquema coincide.
- **Manual antes:** en HA, add-on MariaDB → Network, exponer el puerto 3306 (por defecto no está expuesto), y que el usuario `gaztaindi` acepte conexiones desde la IP del home lab.

### 2. Next.js como servidor en Docker
- `next.config.ts`: `output: 'export'` → `output: 'standalone'`.
- `Dockerfile` multi-stage (deps → build → runner con usuario no root), `.dockerignore`, `compose.yaml` con `env_file` y `restart: unless-stopped`, `GET /api/health` para el `healthcheck`.
- Borrar `deploy.ps1`, `deploy.htaccess` y el script `deploy` de `package.json`: el Apache de HA deja de servir la web.
- **Ficheros:** `next.config.ts`, `Dockerfile`, `.dockerignore`, `compose.yaml`, `src/app/api/health/route.ts`, `package.json`, `deploy.ps1`, `deploy.htaccess`
- **Commit:** `feat: run the web client as a Node server in a Docker container`
- **Verificación:** `npm run build`; `docker build` + `docker run` y abrir `/control` (si Docker Desktop está disponible).

### 3. Programas en `/api/programs`
- `src/server/data/programs.ts`, `src/server/validation/programs.ts`, `src/app/api/programs/route.ts`, `src/app/api/programs/[id]/route.ts`.
- `PATCH` parcial como en FastAPI: solo los campos presentes, 400 si no llega ninguno, 404 si no existe.
- Cliente: `list/page.tsx`, `create/page.tsx`, `edit/page.tsx`, `ProgramCard.tsx` llaman a `/api/programs...`.
- **Commit:** `refactor: serve programs from the web's own api routes`
- **Verificación:** `npm run lint`, `npm run typecheck`; en `npm run dev`: listar, crear, editar y borrar un programa, y comparar el JSON con el de FastAPI.

### 4. Categorías en `/api/categories`
- Igual que la 3. Cliente: `ProgramForm.tsx`, `list/page.tsx`.
- **Commit:** `refactor: serve categories from the web's own api routes`
- **Verificación:** lint, typecheck; crear una categoría desde el formulario.

### 5. Usuarios en `/api/users`
- Igual. El nombre duplicado (`ER_DUP_ENTRY`) sigue dando 409. Cliente: `CurrentUserContext.tsx`.
- **Commit:** `refactor: serve users from the web's own api routes`
- **Verificación:** lint, typecheck; abrir la app sin usuario guardado, crear uno, crear uno repetido.

### 6. Quitar `apiBaseUrl()`
- Fuera `apiBaseUrl()`, `NEXT_PUBLIC_API_PORT` y su entrada en `.env.example`.
- **Commit:** `refactor: drop the separate api host from the web client`
- **Verificación:** lint, typecheck, `grep apiBaseUrl` vacío.

### 7. Broker MQTT configurado en runtime
- El layout raíz lee `MQTT_HOST`, `MQTT_PORT`, `MQTT_PROTOCOL`, `MQTT_PATH`, `MQTT_USER`, `MQTT_PASSWORD` de `process.env` y se los pasa a `MqttProvider`. Sin `MQTT_HOST`, se sigue usando el host de la página.
- Fuera `NEXT_PUBLIC_MQTT_*` y `NEXT_PUBLIC_DEV_HOST`; `resolveHost()` se queda solo para lo que no es MQTT. La comprobación de `localhost` del simulador pasa a mirar el host del broker.
- La config `nextjs-dev-fake-grill` de `.claude/launch.json` pasa `MQTT_HOST=localhost`.
- **Commit:** `feat: read the broker address at runtime instead of baking it into the build`
- **Verificación:** lint, typecheck; `npm run dev` contra la parrilla real y contra `npm run fake-grill`.

### 8. Tarjeta del dashboard de Home Assistant
- `homeassistant/grill.html` y `dashboard-card.yaml` apuntan a `http://192.168.1.103:3000/control` en vez de al puerto 8081 de la HA. Con IP fija el shim ya no necesita copiar `location.hostname`.
- **Commit:** `fix: point the home assistant dashboard card at the home lab`
- **Verificación:** manual, abrir el dashboard por LAN y por Tailscale.

### 9. Borrar `GaztaindiGrill-API`
- Fuera el directorio entero, add-on incluido. `docs/database.md` se mueve a `GaztaindiGrill-NextJS/docs/` antes, porque es el único registro del esquema; `api-reference.md` ya está cubierto por `docs/api.md`.
- **Commit:** `chore: remove the fastapi service now that the web serves its own api`
- **Verificación:** `npm run build`.
- **Manual después:** desinstalar el add-on `gaztaindigrill_api` en HA.

### 10. Herramientas de `.claude/`
- `feature-plan`, `feature-implement`, `commit`, `docs-sync` y `commit-splitter` dejan de nombrar `GaztaindiGrill-API` y el scope `api`.
- **Commit:** `chore: drop the api project from the claude tooling`
- **Verificación:** `grep -r GaztaindiGrill-API .claude` solo encuentra planes antiguos.

Después: `/docs-sync` (CLAUDE.md raíz y de NextJS, `docs/api.md`, `docs/database.md`).

## Decidido después

1. **Web en el home lab:** IP fija `192.168.1.103`, HTTP, puerto 3000. Sin HTTPS, así que el broker sigue en `ws`.
2. **MariaDB y Mosquitto:** por LAN, contra la IP de la HA (`192.168.1.101`): `DB_HOST` y `MQTT_HOST` en el `.env` del servidor.
3. **Imagen en GitHub Actions:** rama aparte, después de esta.
