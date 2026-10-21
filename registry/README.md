# ILC Registry

## Quick start in dev mode

Registry stores its data in PostgreSQL. Start it with `docker compose up postgres` in the root folder, the default
connection settings match it. To connect elsewhere, copy `.env.example` to `.env` in the `registry` directory and
change the `DB_*` variables.

```bash
$ pnpm install
$ pnpm migrate
$ pnpm seed
$ pnpm dev
```

And then browse to [http://localhost:4001/](http://localhost:4001/).

The default credentials are:
**root / pwd** - for admin access.
**readonly / pwd** - for read only access.

## Return database to a clean state

```bash
$ pnpm reset
```

## Run tests

Assuming database is up via docker-compose. The tests recreate the database from `.env` (`ilc` by default),
and some of them create and drop one more database with the `_isolated` suffix.

```bash
$ pnpm test
```

## Secure session on production

To set the session cookie as secure, set the environment variable AUTH_COOKIE_SECURE=true. Note that you will need to use an HTTPS forward proxy to access the registry admin panel.
