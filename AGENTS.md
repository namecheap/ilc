# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Isomorphic Layout Composer (ILC): a layout service that composes pages from micro-frontend "fragments", rendering them on the server (SSR) and handing over to client-side routing (single-spa). The repo is a pnpm workspace (`pnpm-workspace.yaml`) with one lockfile, `pnpm-lock.yaml`, at the root:

- `ilc/` — the composer itself (server + browser client). Port 8233.
- `registry/` — config service and admin UI that ILC reads apps, routes, templates and settings from. Port 4001 (UI login `root`/`pwd`, read-only `readonly`/`pwd`). The admin UI in `registry/client/` is a workspace package of its own.
- `e2e/` — CodeceptJS end-to-end tests that run ILC + Registry + the [demo apps](https://github.com/namecheap/ilc-demo-apps).

Node >= 22 and pnpm (the version in `packageManager` of the root `package.json`, e.g. via `corepack enable pnpm`). The root `pnpm install` installs every workspace package. pnpm only links a package into an app when its `package.json` declares it, so declare every dependency the code imports. Settings (overrides, allowed build scripts, the 2 week `minimumReleaseAge`) live in `pnpm-workspace.yaml`, not in `.npmrc` or `package.json`.

## Commands

Root:

- `pnpm start` — whole local environment via `start_all.js`: ILC dev server, Registry (migrate + seed + dev), the Registry UI watcher, a local OAuth server (`registry/lde/oauth-server.ts`) and the demo apps in Docker. `pnpm start:no-apps` skips the demo apps (when developing them separately).
- `pnpm build` — builds ILC and Registry (needed before E2E).
- `pnpm format` / `pnpm format:check` — Prettier over `registry/**/*.ts` and `ilc/**/*.{js,ts}` only.

ILC (`cd ilc`):

- `pnpm test` — server + `common/` tests (mocha, `ts-node`). `pnpm test:client` — browser tests (karma; builds SystemJS first).
- `pnpm dev` — rebuilds the server on change; `pnpm build` — server (`tsc -p tsconfig.server.json`), SystemJS, client (webpack).

Registry (`cd registry`):

- `pnpm dev`, `pnpm migrate`, `pnpm seed`, `pnpm reset` (DB to a clean state).
- `pnpm test` uses **PostgreSQL**, `pnpm test:mysql` MySQL (start the DBs with `docker compose up postgres` / `mysql`); `pnpm test:sqlite` needs no DB server. MySQL and sqlite are considered as deprecated, we're going to remove them.
- `pnpm migrate:make <name>` creates a Knex migration in `server/migrations`.
- Default DB is SQLite at `server/dbfiles/db.sqlite`. `pnpm test:sqlite` deletes and recreates **that same file**, so it wipes a local dev database. `.env` (from `.env.example`) selects `DB_CLIENT`.

E2E (`cd e2e`, after `pnpm build` at the root): `pnpm start`, `pnpm start:verbose`, `pnpm start:verbose:ui` (visible browser).

### Running a single test file

Both `ilc/.mocharc*` and `registry/.mocharc*` define a `spec` glob, and a file passed on the command line is **added** to it, so `pnpm exec mocha path/to/file.spec.ts` still runs the whole suite. Either filter by title, `pnpm test --grep "<describe or it text>"`, or bypass the config:

```bash
NODE_ENV=test pnpm exec mocha --no-config --require ts-node/register --timeout 5000 --exit path/to/file.spec.ts
```

In `registry`, prefix with `pnpm exec dotenv --` and set `DB_CLIENT` the same way the package scripts do.

## Architecture

### ILC server (`ilc/server`)

Fastify app (`app.js`). Every page request goes through `routes/wildcardRequestHandlerFactory.ts`:

1. Fetch the Registry config through `server/registry/Registry.js` (cached), filtered by domain; Registry address from `config/default.json5` (`registry.address`, env `REGISTRY_ADDR`).
2. Apply the per-browser override from the `ILC-overrideConfig` cookie (`tailor/parse-override-config.ts` sanitizes it against the `overrideConfigTrustedOrigins` setting; `tailor/merge-configs.ts` merges it). This powers "develop in production" (`docs/develop_in_production.md`) and is a security boundary: any URL that survives sanitization is loaded as a script or fetched for SSR.
3. Resolve the route (`common/router`), then render the route's template with TailorX (`tailor/`): fragments are fetched server-side (`tailor/request-fragment.ts`), and the Registry config plus overrides are injected into the page (`tailor/configs-injector.ts`, `tailor/fragment-hooks.js` writes `<script type="text/spa-config-override">`).

### ILC client (`ilc/client`)

single-spa based. `Client.js` boots the page from the injected config, `ClientRouter.js` handles navigation, `registerSpaApps.js` registers apps per slot, `BundleLoader.ts` loads app bundles through a custom SystemJS build (`ilc/systemjs`), `TransitionManager` handles reroute animations and the `ParcelApi` exposes parcels. `ilc/common` is shared between server and client (router, URL processing, i18n cookie). Client debug logs: `localStorage.debug = 'ILC:*'`.

Server and client behavior can be extended with plugins (`ilc-plugins-sdk`), listed in `server.plugins.manifest.js` / `client.plugins.manifest.js`.
Our ownership:

- https://github.com/namecheap/ilc-sdk
- https://github.com/namecheap/ilc-plugins-sdk

### Registry (`registry/server`)

Express 5 + Knex, supporting SQLite, MySQL and PostgreSQL (`server/db/index.ts`). Each entity has its own folder (`apps`, `appRoutes`, `templates`, `sharedLibs`, `sharedProps`, `routerDomains`, `settings`, `authEntities`, `versioning`, …) with `routes/`, interfaces and services. Things that span files:

- **Versioning**: entity writes go through `db.versioning(user, { type, id }, async (trx) => …)` (`server/db/versioning.ts` → `server/versioning/services/Versioning.ts`), which snapshots the record and stores a revertible version. Queries inside the callback must use `trx`. The versioning service is a module singleton bound to one Knex instance via `setDb`.
- **Errors**: handlers may simply throw; Express 5 forwards rejected async handlers to `server/errorHandler`, which maps `httpErrors.*` and Joi validation errors to 4xx and everything else to a logged 500 with an error ID.
- **Settings** have a scope; ILC-scoped ones (e.g. `overrideConfigTrustedOrigins`) are served to ILC.
- **Assets discovery** (`server/runnerAssetsDiscovery.ts`, `pnpm assetsdiscovery`) runs as a separate process in production and refreshes app bundle URLs from their manifests.
- Admin UI: `registry/client`, a React Admin app built with webpack.

Registry tests (`registry/tests`) drive the HTTP API with supertest. Cleanups in `finally`/hooks call `ensureDeleted(req, url)` from `tests/common.ts`, which fails when a record is neither deleted nor already absent, instead of leaving it to break later tests.

## CI and conventions

- Commits follow Conventional Commits (commitlint); husky + lint-staged run Prettier on staged files. Prettier: 4 spaces, single quotes, width 120.
- `.github/workflows/ci.yml` runs on pull requests and pushes to `master`. ILC and Registry are tested inside their Docker images (amd64; arm64 is built on native `ubuntu-24.04-arm` runners). Each PR also builds and tests the base branch (`dest` matrix entries) for the coverage-diff comment. Only `master` pushes publish to Docker Hub (`namecheap/ilc`, `namecheap/ilc_registry`, staged through `namecheap/ilc_tmp`); `release.yml` re-tags them on version tags.
- User-facing docs live in `docs/` (MkDocs, `mkdocs.yml`).
- Currently there is mixed codebase of typescript and javascript, but we're in progress into full migration to the typescript. Convert files to TS if reasonable
- Don't expose any internal infra details like urls, credentials, plugins, etc
