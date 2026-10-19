---
name: codeceptjs-auth
description: >
    Use when a CodeceptJS test needs login, user roles, or session reuse — or
    when another CodeceptJS skill identifies authorization is required. Also on
    auth-related test failures. Trigger on login, sign-in, sign-up,
    authentication, sessions, "logged in", admin/editor/user roles.
---

# CodeceptJS Auth Plugin

The `auth` plugin logs each user in once, captures cookies (or localStorage/token via overrides), and restores the session for subsequent tests. Stale sessions trigger a fresh login automatically.

If the project already has `auth` configured (fundamentals' discovery output), **reuse** its existing inject name and user keys — don't reconfigure.

## Decide first — ask the user

Four answers shape the plugin. Don't guess any.

1. **Is a session needed at all?** Public flows (landing, signup) → skip the plugin.
2. **One user or many?** Default one; add more only when actually exercised.
3. **If many — what splits them?** Role, workspace/tenant, plan tier, sign-in provider, per-test fixture — real systems vary. Ask; use the answer to name `users.<key>` entries.
4. **What's the auth type?**
    - **Form** — default; canonical shape below
    - **OAuth / SSO** — click provider button, drive the IdP page (often separate origin)
    - **Magic link / passwordless** — UI flow rarely worth automating; prefer an API mint or reading the link from a test mailbox
    - **API token** — skip the form; write the token into `localStorage` via `executeScript`, or `I.setCookie(...)`
    - **2FA / OTP** — async `login`; fetch the code from a test mailbox / backdoor before submitting

## Rules

1. **Login flow never lives in the conf.** Put it in `steps_file.js` (if included) or a page object; conf only references it: `login: (I) => I.login()`.
2. **Credentials from env only** — `.env` loaded via `process.loadEnvFile()` (no dotenv dependency). Passwords wrapped with `secret(...)`. No literals anywhere — conf, steps file, test, git history.
3. **`.env` is gitignored; `.env.example` is committed** with names, no values. Gitignore `output/*_session.json` too.

## Canonical shape

```js
// codecept.conf.js — first line of the file
process.loadEnvFile();

export const config = {
    include: { I: './steps_file.js' },
    plugins: {
        auth: {
            enabled: true,
            saveToFile: true,
            users: {
                admin: {
                    login: (I) => I.login(),
                    check: (I) => I.see('Welcome, User', '.navbar'),
                },
            },
        },
    },
};
```

```js
// steps_file.js
import { secret } from 'codeceptjs';
const { I } = inject();

export default function () {
    return actor({
        login() {
            I.amOnPage('/login');
            I.fillField('Email', process.env.ADMIN_EMAIL);
            I.fillField('Password', secret(process.env.ADMIN_PASSWORD));
            I.click('Sign in');
        },
    });
}
```

```sh
# .env (gitignored)        # .env.example (committed)
USER_EMAIL=...             USER_EMAIL=
USER_PASSWORD=<secret>     USER_PASSWORD=
```

## Pre-flight (before writing config)

1. **Read the real login page** — MCP `run_code` to `/login`, inspect the ARIA snapshot (`codeceptjs-exploration`). Field labels / `name` / `id` / submit control from the actual page, not guesses. Unclear authorization mechanism → ask the user.
2. **Pick a role-specific post-login marker** — something rendered only for _this_ user (navbar username, `data-user-role`).
3. **Confirm session storage** — cookies (default) for server-rendered apps; localStorage/sessionStorage for SPAs. Verify after a manual login with `I.executeScript(() => Object.keys(localStorage))`. Cookie fetch/restore silently no-op against token storage.

## Verify

Run a one-Scenario file that calls `login(<role>)` then asserts on the post-login marker:

```bash
npx codeceptjs run --grep '<scenario>' --debug    # real run, not dry — dry-run doesn't init plugins
```

Enable `saveToFile: true` only after this round-trip succeeds — a bad saved session masks a broken `login`.

Then wire into hooks/tests: `Before(({ login }) => login())` for suite-wide, or per-test as needed.

## Multi-role shape

Only after question 3 is answered. Keys named after whatever splits users _in this system_; one matching actor method per key:

```js
users: {
  admin:      { login: (I) => I.loginAsAdmin() },
  workspaceB: { login: (I) => I.loginToWorkspaceB() },
}
```

Don't parameterise into a single `login(key)` — the plugin keys sessions by name, explicit methods read better. Switch mid-Scenario: `session('<key>')` opens a parallel browser context (fundamentals § Writing tests).

## Token / localStorage auth

Override `fetch` / `restore` when sessions live outside cookies:

```js
admin: {
  login: (I) => I.loginAsAdmin(),
  check: (I) => I.see('Admin', '.navbar'),
  fetch: (I) => I.executeScript(() => localStorage.getItem('session_id')),
  restore: (I, session) => {
    I.amOnPage('/')
    I.executeScript((s) => localStorage.setItem('session_id', s), session)
  },
}
```

`check(I, session)` receives whatever `fetch` returned — throw inside `check` to force fresh login (e.g. `/me` endpoint shows wrong user).

## Pitfalls

- Credentials inlined in conf/test — always env-driven + `secret()`.
- Forgetting to gitignore `.env` and `output/*_session.json` — both leak credentials.

## Related skills

- `codeceptjs-fundamentals` — secrets rule, sessions, config mutation trap
- `codeceptjs-exploration` — reading the live login page
- `writing-codeceptjs-tests` / `refactoring-codeceptjs-tests` — invoke this skill when auth is identified
- `debugging-codeceptjs-tests` — auth-related failure patterns
