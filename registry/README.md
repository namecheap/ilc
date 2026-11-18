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

The session cookie expires `AUTH_SESSION_MAX_AGE_SECONDS` after login (8 hours by default), after which the user has to log in again. The session cookie is named `ilc-registry-session`.

## Signing the ILC override config cookie

ILC applies the `ILC-overrideConfig` cookie from any browser. When the registry has a signing key, ILC applies
an override only together with a signature the registry issued, so only an authenticated registry user can start
one. The feature is off until a key is configured; ILC then behaves as before.

Generate an Ed25519 key pair and configure the registry with the private key:

```bash
$ openssl genpkey -algorithm ed25519 -out k1.pem
```

| Variable                                        | Default | Meaning                                                                                                        |
| ----------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `OVERRIDE_CONFIG_SIGNING_PRIVATE_KEYS`          | unset   | JSON object of key id to Ed25519 private key in PEM, e.g. `{"k1":"-----BEGIN..."}`; the PEM may be on one line |
| `OVERRIDE_CONFIG_SIGNING_ACTIVE_KEY_ID`         | unset   | The key id that signs; it must be in the map, or the registry does not start                                   |
| `OVERRIDE_CONFIG_SIGNING_TTL_SECONDS`           | 28800   | How long a signature is valid, 8 hours by default                                                              |
| `OVERRIDE_CONFIG_SIGNING_RATE_LIMIT_PER_MINUTE` | 60      | Sign requests per user per minute                                                                              |

The registry derives the public key of every configured private key and serves the list to ILC as the ILC-scoped
setting `overrideConfigSigningPublicKeys` with the rest of the config. Nothing is stored in the database.

`POST /api/v1/override-config/sign` with body `{ "value": "<cookie value>" }` returns
`{ "signature": "<detached compact JWS>", "expiresAt": "<ISO date>", "untrustedLinks": [] }`. The caller writes the
value it sent as `ILC-overrideConfig` and the signature as `ILC-overrideConfigSignature`, signature first.
`untrustedLinks` lists the links to hosts outside `overrideConfigTrustedOrigins`: they are signed like the rest, ILC
removes them when it applies the cookie, and a client should show them to the developer. Any authenticated user may
sign, read-only ones included, with the UI session or a bearer token. The signature is a detached compact JWS
(`BASE64URL(header)..BASE64URL(signature)`, RFC 7515 Appendix F) with EdDSA over Ed25519 and the unencoded payload
option of RFC 7797; the protected header carries `kid`, `exp` and `sub` (the user). The endpoint answers:

- `404` when no key is configured, so a client writes the unsigned cookie as today;
- `422` when the value is not URI-encoded JSON or `LZUTF8:` encoded, is not an object with only `apps`, `routes` and
  `sharedLibs`, or does not fit the 4096-byte cookie limit together with its name;
- `429` over the per-user rate limit.

Every signature is logged with the user, the app names, the hosts in the override and the untrusted links.

To rotate a key, add the new key to the map and make it active, keep the old key in the map for one TTL so the
cookies it signed stay verifiable, then remove it. To revoke a leaked cookie at once, remove its key from the map.
Removing every key switches the feature off again.

## CLI and agent login (OAuth)

A tool that runs on a developer's machine, such as the Registry CLI or an agent, signs in through the OAuth 2.1
authorization code flow with PKCE and gets a Registry session limited to scopes. No client secret is involved.

With OpenID enabled the login has to run on the Registry's base URL (the `baseUrl` setting, or `infra.settings.baseUrl`),
because the OpenID provider redirects back to that host and the login state lives in its session cookie. A request to
`/oauth/authorize` that arrives through another host, such as `localhost` instead of the base URL's name, is redirected
there first with its query intact, so a client may use any name the Registry answers on.

### Scopes

| Scope            | Allows                              |
| ---------------- | ----------------------------------- |
| `override:sign`  | `POST /api/v1/override-config/sign` |
| `registry:read`  | every `GET` under `/api/v1`         |
| `registry:write` | every other method under `/api/v1`  |

A session created by the UI login has no scopes and is limited by its role only. A session with scopes is limited to
them on top of the role, so a scope never exceeds the role: a `registry:write` session of a read-only user still
cannot write. A request outside the scopes is a `403` with `{ "message": "... \"<scope>\" is required." }`.

### Routes

| Route                                         | Purpose                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata: the endpoints, scopes and methods below                                           |
| `GET /oauth/authorize`                        | Signs the user in (OpenID when enabled, the admin UI login otherwise) and redirects back with a code |
| `POST /oauth/token`                           | Exchanges the code for an access token, form-encoded, 30 requests per minute per IP                  |
| `POST /oauth/revoke`                          | Ends the session of a token (RFC 7009), always `200`                                                 |

The client id is fixed, `ilc-registry-cli`, and the redirect URI must be a loopback address on any port,
`http://127.0.0.1:<port>/...` or `http://localhost:<port>/...` (RFC 8252 section 7.3): the tool listens there for
the redirect. A wrong client or redirect URI is shown on the admin UI error page (`/#/oauth/error`); every other error
is sent to the redirect URI as `error`, `error_description` and `state`. The `scope` parameter is space separated and defaults to
`override:sign`; an optional `resource` must be the registry's own URL.

The access token is a Registry session value, the same as the `ilc-registry-session` cookie: it has the same max age
(`AUTH_SESSION_MAX_AGE_SECONDS`), it does not slide with use, and it works both as a bearer token and as that cookie.
The login that issues it is only possible from an unscoped browser session, a scoped session cannot mint another.

### Example

The tool generates a PKCE verifier and opens the authorize URL in the browser:

```bash
$ code_verifier=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)
$ code_challenge=$(printf '%s' "$code_verifier" | openssl dgst -sha256 -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')
$ open "http://localhost:4001/oauth/authorize?response_type=code&client_id=ilc-registry-cli\
&redirect_uri=http%3A%2F%2F127.0.0.1%3A8765%2Fcallback&code_challenge=$code_challenge\
&code_challenge_method=S256&state=xyz&scope=override%3Asign%20registry%3Aread"
```

The browser comes back to `http://127.0.0.1:8765/callback?code=<code>&state=xyz` within a minute, and the tool
exchanges the code:

```bash
$ curl -X POST http://localhost:4001/oauth/token \
    -d grant_type=authorization_code -d client_id=ilc-registry-cli \
    -d redirect_uri=http://127.0.0.1:8765/callback -d code=<code> -d code_verifier=$code_verifier
{"access_token":"s:...","token_type":"Bearer","expires_in":28800,"scope":"override:sign registry:read"}
```

The token is used as a bearer token:

```bash
$ curl -X POST http://localhost:4001/api/v1/override-config/sign \
    -H 'Authorization: Bearer s:...' -H 'Content-Type: application/json' \
    -d '{"value":"<cookie value>"}'
$ curl -X POST http://localhost:4001/oauth/revoke -d 'token=s:...'
```
