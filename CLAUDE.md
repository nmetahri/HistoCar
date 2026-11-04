# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

HistoCar — multi-user PWA to track the maintenance history of personal vehicles, keep the invoices of each maintenance, and download per vehicle an A4 PDF maintenance sheet plus one PDF merging all its invoices. npm workspaces monorepo: `packages/server` (Express + Prisma + Postgres) and `packages/web` (React + Vite + vite-plugin-pwa).

**The code is English; the UI is French.** Identifiers, file names, test descriptions and log/boot messages are English. Every string the end user sees stays French: form labels, the generated PDFs, and API error messages returned in JSON (`"Véhicule introuvable"`, `"Données invalides"`). Keep that split when adding code.

## Commands

Everything routine goes through the Makefile — `make help` lists the targets. The npm scripts below still work and are what the Makefile calls.

```bash
make setup                                 # cp .env.dist .env + npm install + prisma generate
make dev                                   # dev stack in Docker: db + server (:3001, debugger :9229) + vite (:5173)
make dev-logs / dev-shell / dev-db         # logs, shell in the server container, psql
make migrate NAME=add_x                    # prisma migrate dev inside the dev container
make dev-prune                             # dev containers + volumes (data, uploads AND node_modules)
make up-prod                               # prod stack + cloudflare tunnel (runs tunnel-check first)
make update-prod                           # rebuild + restart prod without downtime
make logs-prod / shell-prod / db-prod      # logs, shell in the server container, psql
make down-prod / prune                     # stop, stop + destroy the Postgres AND uploads volumes
make verify                                # lint + typecheck + tests

npm install                                # root, installs both workspaces
npm run dev                                # server :3001 + web :5173 via concurrently, outside Docker

npm run verify                             # lint + typecheck + tests — run this before declaring done
npm run lint                               # biome check (whole repo)
npm run lint:fix                           # biome check --write
npm run typecheck                          # both workspaces, no emit
npm run build                              # both workspaces
npm run test                               # vitest run (server workspace)

npm run test:watch -w packages/server                       # watch mode
npx vitest run tests/report.test.ts -w packages/server       # single file
npx vitest run -t "sorts records" -w packages/server         # single test by name

npm run prisma:migrate -w packages/server                # prisma migrate dev
npm run prisma:generate -w packages/server               # required before first typecheck/test run
```

Pushing to `main` deploys: `.github/workflows/deploy.yml` runs on a self-hosted runner, copies `.env`, `cloudflared/config.yaml` and the tunnel credentials from the runner's secrets directory (`/home/runner-histocar/secrets/`; none of them is in git), then `make update-prod`.

## Imports — aliases only, no relative paths

There are no relative imports in this codebase. Both workspaces resolve `@/*` to their own `src/*`, and the server also has `@tests/*` → `tests/*`. Four places must agree, so adding an alias means touching all of them:

| Where | Mechanism |
|---|---|
| `packages/*/tsconfig.json` | `baseUrl` + `paths` (typechecking only) |
| server dev | `ts-node-dev -r tsconfig-paths/register` (in the `dev` script) |
| server build | `tsc && tsc-alias` — `tsc` alone leaves `@/` in the output, `tsc-alias` rewrites it to relative requires |
| web | `resolve.alias` in `vite.config.ts` (Vite ignores tsconfig paths) |
| vitest | `resolve.alias` in `vitest.config.mts` |

`vitest.config.mts` uses `.mts` because the server package is CommonJS; it is excluded from `tsconfig.test.json` since `import.meta` cannot typecheck under `module: CommonJS`. For the same reason, ESM-only packages cannot be imported from the server.

## Docker

Two stacks, both driven by the Makefile, following the same convention as the other projects (`make dev` / `make up-prod`):

| File | Target | Services |
|---|---|---|
| `docker-compose.dev.yml` | `make dev` | db + server (ts-node-dev, `:3001`, debugger `:9229`) + web (vite `:5173`) |
| `docker-compose.yml` | `make up-prod` | db + migrate + server + web (nginx `:8080`) + cloudflared tunnel |

Both prod Dockerfiles install **only their own workspace** (`npm ci -w packages/<name>`, and `npm prune --omit=dev -w packages/server` — without `-w`, prune reinstalls the web's runtime deps) with a BuildKit cache mount on `/root/.npm` and fetch retries, so a rebuild downloads little and a flaky network is retried rather than fatal.

### Dev stack

Source is bind-mounted (`.:/app`); `node_modules` lives in **named volumes per container** so the Linux-native binaries (Prisma engines, esbuild, sharp) never collide with the host's. Each container installs on boot through `packages/*/docker/entrypoint.dev.sh` — the server one also runs `prisma generate` + `migrate deploy` before starting. **After adding a dependency or a migration, restart the container** (`docker restart histocar-server-dev`) so the entrypoint picks it up. Uploaded files go to the `server_uploads` named volume, not the bind mount: the container runs as root and would leave root-owned files on the host. `make dev-prune` wipes all of it, and the next `make dev` is slow.

Dev is **not** same-origin: vite serves `:5173` and talks to `:3001` directly, so `WEB_ORIGIN=http://localhost:5173` and `VITE_API_URL=http://localhost:3001/api` are set in `docker-compose.dev.yml` and override the `.env` values (which are written for prod).

### Prod stack

The app is served on **http://localhost:8080** only — neither the server nor Postgres is published to the host; the server is reached through nginx, the database through `make db-prod`.

Five services:
- **db** — Postgres 16, data in the `db_data` volume.
- **migrate** — one-shot `prisma migrate deploy`, built from the server Dockerfile's `builder` stage (the only stage carrying the Prisma CLI). `server` waits on `service_completed_successfully`, so migrations never race the app. The image is large (~600MB) because that stage holds the dev dependencies; it is transient and never runs alongside the app, but if you start pushing images to a registry, give it a slimmer dedicated stage.
- **server** — the `runtime` stage, runs as the `node` user, `HEALTHCHECK` hits `GET /api/health`. Invoices live in the `uploads_data` volume mounted on `/app/uploads` (`UPLOADS_DIR`); the Dockerfile creates that directory owned by `node` so a fresh volume inherits the ownership.
- **web** — nginx serving the built assets, and proxying `/api/` to `server:3001`.
- **cloudflared-tunnel** — the only public entry point. Defined in the `cloudflared-tunnel` git submodule (`tunnel.compose.yml`, pulled in with `include:`) and extended in `docker-compose.yml` to join `histocar-network`, which is what lets it address the web container as `histocar-web`.

**Back up `db_data` and `uploads_data` together.** The database only holds invoice metadata; restoring one without the other leaves broken or orphaned files.

**The `${TUNNEL_UUID}` in `cloudflared/config.yaml` is never expanded** — cloudflared reads the file literally. It works because `docker-compose.yml` overrides the command with `--cred-file /etc/cloudflared/${TUNNEL_UUID}.json` and `tunnel run ${TUNNEL_UUID}`, where Compose *does* interpolate. The ingress hostnames, on the other hand, must be written out literally. `cloudflared/config.yaml` is gitignored so the real hostname stays out of the repo; `config.example.yaml` is the committed template. `make tunnel-check` (a prerequisite of `up-prod` and `update-prod`) fails if `TUNNEL_UUID` is empty, the credentials file or `config.yaml` is missing, or the `example.com` placeholder is still in it — so a deploy without the config stops before touching the running containers.

Setting up the tunnel once:

```bash
git submodule update --init                         # the tunnel compose fragment
cloudflared tunnel login
cloudflared tunnel create histocar-tunnel          # prints the UUID and writes ~/.cloudflared/<UUID>.json
cp ~/.cloudflared/<UUID>.json cloudflared/
cloudflared tunnel route dns histocar-tunnel histocar.<domain>
cp cloudflared/config.example.yaml cloudflared/config.yaml   # then set the real hostname in it
# and TUNNEL_UUID=<UUID> in .env
```

**Everything is same-origin in Docker.** The web image is built with `VITE_API_URL=/api` (a build arg — the value is baked into the bundle, so changing it requires a rebuild, not a restart), and nginx proxies `/api/` to the server. No CORS preflight, and the auth cookie is first-party. `nginx.conf` also handles the SPA fallback (`try_files … /index.html`), keeps `sw.js`, `index.html` and the manifest uncacheable so PWA updates land, and raises `client_max_body_size` on `/api/` to fit an upload — keep it above the multer limits in `attachments.upload.ts`, or nginx answers 413 before the server sees the request.

Three traps worth knowing:

1. **Compose interpolates `$` in `.env` values.** A secret containing `$` (e.g. a generated `JWT_SECRET`) arrives truncated unless each `$` is written `$$`. Quotes, on the other hand, are stripped as dotenv would.
2. **Changing `POSTGRES_PASSWORD` does not affect an existing volume.** Postgres only applies it when initializing an empty data directory. Either keep the password, or drop the volume (`docker compose down -v`, which destroys the data).
3. **`NODE_ENV=production` makes the auth cookie `Secure`.** Browsers treat `localhost` as trustworthy so `http://localhost:8080` works, but on any other host the cookie is silently dropped over plain HTTP — the tunnel provides the TLS in prod.

## Env setup

Both Docker stacks read the **root `.env`** (template: `.env.dist`, created by `make setup`). For local non-Docker development, copy the two `packages/*/.env.example` files as well. `packages/server/.env` must define `WEB_ORIGIN` and `JWT_SECRET` — `src/env.ts` throws at boot if either is missing. Optional: `SIGNUP_INVITE_CODE` (absent means registrations are closed), `UPLOADS_DIR` (defaults to `./uploads` relative to the working directory, gitignored), `RATE_LIMIT_ENABLED` (forced on in production). `packages/web/.env` needs `VITE_API_URL` (includes the `/api` prefix).

`env.ts` reads `process.env` once, at import. A test that needs another value must stub the variable, `vi.resetModules()`, then import dynamically — see `auth-config.test.ts` and `storage.test.ts`.

Tests need neither a DB nor a `.env`: `tests/setup.ts` injects the env vars and `tests/app.test.ts` mocks `@/prisma` and the attachment storage. A generated Prisma client *is* required (`prisma:generate`) because `src/http/errors.ts` uses `Prisma.PrismaClientKnownRequestError`.

## Architecture

**Auth is multi-user, accounts live in the `User` table.** Accounts are created through `POST /auth/register`, gated by `SIGNUP_INVITE_CODE`; there are no credentials in env. Login checks the bcrypt `passwordHash` in DB, then sets a signed JWT (`sub` = user id) in the httpOnly cookie `histocar_token` (7d). `requireAuth` verifies the signature and re-reads the user from DB, so a deleted account loses access immediately. Login and register are rate-limited per IP in production (`auth.rate-limit.ts`, built inside `createApp` so tests can toggle it); `trust proxy` is set so `req.ip` is the real client behind nginx + cloudflared. The web client sends `credentials: "include"` everywhere, and CORS is locked to `env.webOrigin` with credentials.

**Ownership is checked, never assumed.** Every vehicle belongs to a user and every query is scoped through the `*.access.ts` helpers: `vehicles.access.ts` (vehicle), `maintenance.access.ts` (record, checked against both its vehicle and its owner), `attachments.access.ts` (attachment → record → vehicle → owner). A resource owned by someone else answers 404, never 403, so its existence is not revealed. Deleting a vehicle only archives it (`active = false`); archived vehicles and everything under them are unreachable except through `POST /vehicles/:id/restore`.

**Router mounting** (`src/app.ts`): every router is mounted at `/api`; each router declares its own full path (`/vehicles/:id`, `/vehicles/:vehicleId/maintenance/:id`, `/vehicles/:vehicleId/maintenance/:recordId/attachments/:id`). `healthRouter` (`GET /api/health`, used by the Docker healthcheck) and `authRouter` are public (the latter's `/auth/me` applies `requireAuth` itself); `vehicles`, `maintenance`, `report` and `attachments` sit behind `requireAuth`. `errorHandler` is mounted last.

**Errors go through one place — `src/http/errors.ts`.**
- `asyncRoute(handler)` wraps every async route, `asyncMiddleware` every async middleware. Express 4 does not catch promise rejections, so without them a failing Prisma call leaves the request hanging. **Any new async handler must be wrapped.**
- `HttpError(status, message)` for business errors — `throw new HttpError(StatusCodes.NOT_FOUND, "Véhicule introuvable")` instead of `res.status(...)` + `return`.
- `errorHandler` maps `HttpError` → its status, `ZodError` → 400 `{message: "Données invalides", details}`, `MulterError` → 413 for an oversized file, 400 otherwise, Prisma `P2025` → 404, everything else → logged + generic 500.

Because Zod errors are handled centrally, routes call `schema.parse(req.body)` (throwing), not `safeParse` + a manual 400.

**Both PDFs are generated on demand, never cached** (`Cache-Control: no-store`); mutation routes neither need nor should regenerate anything.
- **Maintenance sheet** — `GET /vehicles/:id/report.pdf?currentMileage=N`. The current mileage is required and never stored: a vehicle only keeps `initialMileage` + `initialMileageDate` (a reference reading, e.g. at purchase). `report/report.data.ts` is pure: `toReportModel(vehicle, records)` sorts, formats and sanitizes into a `ReportModel` (rows with a cost column, the total of the known costs, and the vehicle's free-text `notes` — `null` when blank, so the "Notes additionnelles" block is only drawn when filled). `report/pdf/*` draws it with pdfkit (`builder.ts` for the page, `table.ts` for the paginated table, `layout.ts` for the constants). pdfkit's built-in Helvetica only encodes WinAnsi, so every user string goes through `sanitizeWinAnsi`, and numbers are formatted by hand — `Intl` inserts U+202F, which Helvetica cannot render. Dates use `getUTC*` deliberately to avoid timezone drift.
- **Merged invoices** — `GET /vehicles/:id/attachments.pdf`. `attachments.service.ts` loads the vehicle's attachments (records newest first, attachments in upload order), `attachments.merge.ts` concatenates them with pdf-lib: PDF pages are copied, each image gets its own A4 page oriented to fit. An unreadable or missing file becomes a "Document illisible" page instead of failing the whole download. 404 when the vehicle has no attachment.

**Attachments (invoices)** belong to a maintenance record (`Attachment.maintenanceRecordId`, cascade delete); a record can have several. The file lives on disk under `UPLOADS_DIR/<userId>/<uuid>.<ext>`; the DB row holds `storageKey`, `originalName`, `mimeType`, `sizeBytes`. `storageKey` never leaves the server (`publicAttachmentSelect`).
- Upload (`POST …/attachments`, multipart field `files`): ownership is checked **before** multer reads the body; multer keeps files in memory (10 MB each, 5 per request, UTF-8 file names). The real type comes from the magic bytes (`attachments.file-type.ts`: PDF, JPEG, PNG only), never from the client's `Content-Type`. Then `attachments.compress.ts` stores a light copy: images go through sharp (EXIF auto-rotate and metadata strip, max 2000 px, JPEG q80, white background) so **stored images are always JPEG**; PDFs are rewritten with pdf-lib object streams and kept only if smaller. A batch is all-or-nothing: files written before a failed insert are removed.
- Download (`GET …/attachments/:id`) serves inline with an RFC 5987 file name (`http/file-name.ts`) and `Cache-Control: private, no-store`.
- Deletion removes the DB row first, then the file (`removeAttachmentFiles` logs failures instead of throwing): an orphan file is harmless, a row pointing to nothing is not. Deleting a maintenance record collects its storage keys before the cascade and removes the files after it. Archiving a vehicle keeps every file.

**Validation**: zod schemas per feature module (`*.schema.ts`), with `xxxUpdateSchema = xxxSchema.partial()` for PUT. `MaintenanceRecord.date` is a `@db.Date` column: the API takes and returns an ISO `YYYY-MM-DD` string and the routes convert with `new Date(...)`. `MaintenanceRecord.costCents` is an optional integer in euro cents — the web form edits euros and converts.

**Web side**: `src/api/client.ts` is the single API surface — one `request<T>` helper (JSON by default, no `Content-Type` for a `FormData` body) plus a flat `api` object; it also owns the TS interfaces mirroring the Prisma models (`Vehicle`, `MaintenanceRecord`, `Attachment`, `VehicleWithMaintenance`). `AuthContext` calls `api.me()` once on mount to restore the session, and `ProtectedRoute` gates `/` and `/vehicles/:id`. Pages hold their own state with `useState`/`useEffect`; there is no data-fetching library and no component library — all styling lives in the single `src/styles.css`, with English class names (`.card`, `.field`, `.btn-primary`, `.report-card`). `Vehicle.notes` is optional free text (useful links, part references); `VehicleInfo` renders it with `LinkifiedText`, which turns `http(s)://` URLs into links without injecting HTML. On `VehicleDetail`, the history table shows the cost and a total footer but no attachment column: attachments are picked in the add form (uploaded right after the record is created) and managed in a row's edit mode (`AttachmentsEditor`). `mileage/estimate-mileage.ts` estimates the mileage at a date from the readings (production year at 0 km, the initial reading, the records): linear interpolation between the surrounding readings, extrapolation at the last known year's pace outside them, rounded to 100 km. It feeds the placeholders and the "Déduire depuis l'historique" button. The sheet is downloaded through a native GET form asking the current mileage; the invoices PDF is a plain download link; "Télécharger les justificatifs" only appears when at least one attachment exists.

**PWA**: `vite.config.ts` configures `VitePWA` with `autoUpdate`; `/api` is explicitly `NetworkOnly` and excluded from the navigation fallback, so never rely on the service worker to cache API data.

## Tests

Vitest in `packages/server/tests/`:
- `report.test.ts` — report model: formatting, sorting, costs and total, WinAnsi sanitizing, PDF generation and pagination
- `attachments.test.ts` — file-type detection, compression, PDF merge, content-disposition encoding
- `storage.test.ts` — the real disk storage in a temp directory, including the path-escape guard
- `schemas.test.ts` — zod contracts
- `app.test.ts` — supertest against `createApp()` with `@/prisma` and `@/attachments/attachments.storage` replaced by `vi.hoisted` mocks; covers auth, 401 gating, ownership scoping, status codes, the error handler, uploads, and both PDFs
- `auth-config.test.ts` — boot-time config: closed registrations, rate limiting

`tests/fixtures.ts` builds full `User`/`Vehicle`/`MaintenanceRecord` objects with overrides, and real JPEG/PNG/PDF buffers (`jpegFixture`, `pngFixture`, `pdfFixture`). `tsconfig.test.json` is what typechecks the tests (the build tsconfig covers `src` only, so that `dist/index.js` sits at the root of `dist`).

Adding a route means adding an `app.test.ts` case — the mocks make it cheap and no DB is involved. The web workspace has no tests yet.

## Conventions

- **Comments are rare, in French, and explain why** — a constraint, a trap, a non-obvious choice. Never what the code does: express that through names.
- **No magic numbers**: HTTP statuses come from `http-status-codes` (`StatusCodes.NOT_FOUND`), in both workspaces and in tests; other values are named constants.
- Both tsconfigs are `strict` with `noUncheckedIndexedAccess`, hence `req.params["id"] as string` on route params. Biome's `useLiteralKeys` is disabled for this reason (see `biome.json`).
- Biome owns formatting and linting (100 cols, double quotes, trailing commas, sorted imports). Run `npm run lint:fix` rather than formatting by hand.
- Server is CommonJS (`type: "commonjs"`), web is ESM.
- Feature folders on the server pair `*.routes.ts` with `*.schema.ts`, plus `*.access.ts` for ownership checks; routers are named exports.
