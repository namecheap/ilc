---
name: codeceptjs-fundamentals
description: >
    Run first when working with any CodeceptJS 4 project — before writing,
    debugging, refactoring, or migrating tests. Teaches the framework's
    non-obvious rules and runs four-step discovery (`check` → read config →
    `list` → `dry-run`) reporting which helpers, plugins, page objects, custom
    actions, and tests are active. Other CodeceptJS skills depend on this output.
---

# CodeceptJS Fundamentals

Two jobs, in order: learn the rules below, then discover what _this_ project has configured.

## Gate

- CodeceptJS 4 is **ESM/TypeScript only**; tests, configs, page objects, helpers use `import`/`export`.
- No `"type": "module"` in package.json → add it before anything else.
- TypeScript: config `codecept.conf.ts`, TS loader entry in `require: [...]`.
- Project on 3.x or CommonJS (`require()`, removed plugins like `autoLogin`, helper `Nightmare`) → stop, recommend `migrate-codeceptjs-4`. Don't patch files piecemeal — migration is whole-project.

## Main rule

- Tests are written from the user's perspective: a linear scenario of actions, readable as prose.
    - Good: `I.click('Login')`, `I.fillField('Email', ...)`, `I.see('Welcome')`
- **Tests are declarative, helpers imperative — recommended layering:**
    - Scenario shows _what_ the user does via `I.*`; implementation details live below
    - Low-level access (`this.helpers['Playwright'].page`, fetch, filesystem) works fine inside a Scenario, but it's recommended to push it into a helper and expose one `I.*` action instead
- Keep tests short: repeated sequences → actor method, page object, or step object.
- Prefer semantic locators over selectors so tests survive markup churn.

## Where things go (recommended placement)

- Site-wide actions (`login`, dropdowns, rich text editors) → **actor file** (custom steps)
- Page/screen actions + locators → **page object**; SPA screen = one page object
- Site-wide widgets (nav, modals, datepickers) → **page fragments / component objects**
- Low-level driver access (DB connections, email, filesystem, complex mouse) → **helper**
- Data creation/cleanup via API → **data objects** (REST/GraphQL helper + `_after()` cleanup), or `ApiDataFactory` (`I.have(...)`)
- Don't overengineer: no page object until an abstraction is reused across tests.

## Shortcuts

- Login needed → `autoLogin` plugin or actor method, not inline steps per test
- Test data → create via API before the test, not through the UI
- Long test → break into several; long tests are fragile and hard to follow
- Optional UI element / conditional flow → `await tryTo(...)` instead of `if (await I.grab...)` — keeps scenarios linear

## Architecture

- **Config**: `codecept.conf.{js,ts,mjs,cjs}` at repo root; multiple files selected via `--config <file>`.
- **Helpers execute; `I` delegates.** Every `I.<method>` is routed to whichever active helper implements it (Playwright, WebDriver, Puppeteer, Appium share one API surface). Active helpers = keys under `helpers`. Tests call the actor, never the engine — backends stay swappable.
- **DI container** — why it exists:
    - Everything shared (actor, helpers, page objects, support objects) registers under one container; `include` maps names → modules
    - Classes are auto-instantiated by the container — no `new`, no manual wiring
    - **`inject()` returns lazy proxies**: destructuring at module top resolves at call time, so circular page-object references work where plain `import` would give `undefined`
    - Access: destructure in Scenario signature (`Scenario('...', ({ I, loginPage }) => ...)`) or `const { I } = inject()` once per file
- **Custom helpers** extend `Helper`, register under `helpers`, add new `I.*` methods.
    - **`I` does not exist inside a helper.** Compose via `this.helpers['<HelperName>']` (e.g. `this.helpers['Playwright'].page`, `this.helpers['REST'].sendGetRequest(...)`).
- **Plugins** are event listeners on lifecycle events (`suite.*`, `test.*`, `step.*`, `hook.*`, `multiple.*`). Full list: `node_modules/codeceptjs/lib/event.js`. Register under `plugins` with `enabled: true`.

## Config mutation trap

- `@codeceptjs/configure` mutates resolved config at load time (`setHeadlessWhen`, `setBrowser`, ...). Static values can lie — grep for its import before trusting `show:` / `browser:` fields.
- `setCommonPlugins()`: **enables** `retryFailedStep` + `screenshot`; **registers** (off until `-p`) `pause`, `browser`, `aiTrace`, `heal`.

## Plugins worth knowing

- `retryFailedStep` — retries transient step failures
- `screenshot` — screenshots on failure; `slides: true` → `output/records.html` slideshow
- `pageInfo` — dumps URL/HTML/console on failure
- `auth` — session reuse for login (see `codeceptjs-auth` skill)
- `aiTrace` — per-step screenshots/HTML/ARIA/console for AI debugging
- `pause` — interactive pause
- `heal` — AI-suggested fixes for broken steps (off in `--debug`)
- `screencast` — video of the run
- `customLocator` — maps `$name` prefix to team's test attribute (`data-testid`, `data-qa`)
- `browser` — CLI-only override of browser helper config (see below)

Note: `tryTo`, `retryTo`, `eachElement` are not plugins in 4.x — import them from `codeceptjs/effects`.

## Plugins from CLI

Any plugin can be enabled/reconfigured per-run with `-p <plugin>`, args chained with `:`:

```sh
npx codeceptjs run -p aiTrace                    # enable for this run
npx codeceptjs run -p screenshot:on=step         # reconfigure inline
npx codeceptjs run -p pause:on=file:path=tests/login_test.js;line=43
```

- `screenshot`, `pause`, `aiTrace`, `heal` share an `on=` trigger: `fail` (default except aiTrace) | `step` | `test` | `file:path=...;line=N` | `url:pattern=<glob>`
- `browser` plugin overrides without touching config — CI matrix legs, one-off env variants:
    - `-p browser:hide` / `-p browser:show` / `-p browser:browser=firefox` / `-p browser:windowSize=1280x800`
    - Requires `@codeceptjs/configure`

## Effects (`codeceptjs/effects`)

Flow-control functions imported from `codeceptjs/effects`. In 4.x these are no longer plugins/globals.

- **`tryTo(() => ...)`** — runs steps that may fail without stopping the test; returns `boolean`.
    - **Prefer `tryTo` over `if`:** scenarios should stay linear — instead of branching on a grabbed value to decide whether a UI state exists, attempt the optional steps and branch on the boolean result:
        ```js
        const banner = await tryTo(() => {
            I.see('Cookie banner');
            I.click('Accept cookies');
        });
        if (!banner) I.say('No cookie banner');
        ```
    - Auto-retries are disabled inside `tryTo` blocks.
- **`retryTo(() => ..., maxTries, pollInterval = 200)`** — retries a step block until it succeeds (flaky elements, animations); callback receives the current attempt count.
- **`hopeThat(() => ...)`** — soft assertions (see Assertions); end with `hopeThat.noErrors()`.
- **`within(locator | { frame }, fn)`** — scopes resolution to subtree or iframe; can return values (`await`). Prefer the context parameter of individual actions (`I.click('Save', '.toolbar')`) when possible — reserve `within` for genuinely scoped blocks.

All effects return Promises — `await` them.

## Element-based API (`codeceptjs/els`)

Hybrid style: mix `I.*` with direct element access. Import `{ element, eachElement, expectElement, expectAnyElement, expectAllElements } from 'codeceptjs/els'`.

- `element(locator, async el => { ... })` — scoped access to one element; chain `el.$(locator)` into children without re-querying
- `eachElement(locator, async (el, index) => ...)` — iterate collections
- `expectElement` / `expectAnyElement` / `expectAllElements(locator, fn)` — custom conditions
- Elements are `WebElement` wrappers — same API on all helpers: `getText()`, `getAttribute()`, `isVisible()`, `isEnabled()`, `getBoundingBox()`, `exists()`, `$$()`
- Optional purpose string improves debug logs: `element('verify discount applied', '.price', ...)`
- Use when built-ins don't cover it: collections, layout checks (`getBoundingBox`), per-element loops, chaining ops on one element. Prefer `I.*` for readability otherwise.

## Writing tests

- Structure: one `Feature(...)` per file, one or more `Scenario(...)` inside. No nested suites, no multiple Features per file.
- Hooks: `Before`, `After`, `BeforeSuite`, `AfterSuite`, `Fail(...)`.
- Page object lifecycle hooks: `_before()` (lazy, once per test, on first use), `_after()` (skipped if unused), `_beforeSuite()`, `_afterSuite()`.
- **`await` required for**: `grab*` methods, imported functions, page-object methods containing async ops (elsewhere: unhandled rejections). Never for plain action steps — the recorder chains them.
- Secrets: `I.fillField('Password', secret(process.env.PASSWORD))` — masks logs, traces, AI prompts. Import from `codeceptjs`.
- Sessions: `session(name, fn)` — parallel browser context for multi-user Scenarios (chat, multi-tenant).

## Locators

- **ARIA locators are strongest** — resilient to CSS refactors, describe what the user sees:
    - `I.click({ role: 'button', name: 'Save' })`
- Actions accept plain strings (visible text, label, placeholder, `name`, `aria-label`) or objects (`{ css }`, `{ xpath }`, `{ id }`).
- Plain string already matches `aria-label` — no `'aria-label=...'` prefix needed.
- **Pass context as last argument** — scoped semantic locator beats long unscoped one:
    - `I.click('Save', '.toolbar')` not `I.click('#toolbar .btn-save')`
- Avoid style-based class names (`.bg-green`); prefer semantic ones (`.btn-save`).
- `data-testid`/`data-qa` apps → enable `customLocator`, write `$name`.
- No semantic name fits → `locate(...)` builder (`.withClass`, `.withText`, `.inside`, `.and`): `locate('.button').withText('Click me')`.

## Waiting

- Action steps auto-wait for existence + interactability. Add explicit `waitFor*` only when the condition isn't tied to an interaction (modal after network call, spinner hiding).
- Avoid `I.wait(N)` — last resort.

## Assertions

Built-in browser assertions come first: `I.see`, `I.seeTextEquals`, `I.seeElement`, `I.seeInField`, `I.seeNumberOfElements`, `I.seeInCurrentUrl` (+ `dontSee*` counterparts). Clear failures, recorder-integrated. `see` matches _visible_ text; hidden DOM content needs `seeInSource` / `seeElementInDOM`.

For what built-ins don't cover, in order of preference:

1. **Reusable custom assertion** in a helper — `I.seeTableIsOrdered('Price', 'desc')`; name positives `see*`, negatives `dontSee*`; use `codeceptjs/assertions` inside, never raw `throw new Error()`
2. **ExpectHelper** (`@codeceptjs/expect-helper`) — chai matchers on `I`: `I.expectEqual`, `I.expectDeepEqualExcluding`, `I.expectMatchesPattern`, `I.expectJsonSchema`; appears in step log like other steps
3. **`codeceptjs/assertions`** directly — dependency-free factories: `equals(subject).assert(actual, expected)` / `.negate(...)`; failure messages match `I.see` formatting
4. **Any library** on grabbed data (`grab*` always needs `await`) — chai/jest/`node:assert`; fails the test but won't show as a step

Soft assertions: `hopeThat(() => I.see(...))` from `codeceptjs/effects` — logs each failure and continues; end with `hopeThat.noErrors()` to fail if any were recorded.

## Parallel runs

- `run-workers <N>` — splits Scenarios across worker threads
- `run-multiple <profile>` — profiles via `multiple` block in config (browsers, viewports)

## Config organization (recommended)

- Multiple config files per environment (`codecept.conf.js`, `codecept.ci.conf.js`, ...); share parts via modules in a `config/` dir
- `.env` files + `dotenv` for secrets/env-specific values
- Bulk-register page objects/components by spreading exported maps into `include`
- Pass data from config/bootstrap into tests via `codeceptjs.container.append({ testUser })` — injectable by name

## Discover this project

In order; skipping steps produces wrong guesses:

1. **Verify setup loads**: `npx codeceptjs check -c <config>` — validates everything; output doubles as inventory. Fix failures before continuing.
2. **Read the active config**: helpers (+ browser/baseURL/viewport/env-driven values), plugins (incl. anything `setCommonPlugins()` injects), AI provider + required env var, env selection mechanism, page objects from `include`, custom helpers.
3. **List actions**: `npx codeceptjs list -c <config>` (`--docs` adds JSDoc; `--action <name>` for one). The actual `I.*` surface differs from built-ins when custom helpers exist — always check before suggesting a method.
4. **List tests**: `npx codeceptjs dry-run -c <config>` — `--steps` shows queued actions, `--grep` filters, `--numbers` gives per-test step indices matching MCP `pauseAt`.
    - ⚠ `dry-run --grep` and `run --grep` do **not** select the same set (4.1.0): `run --grep` matches `Feature` + `Scenario`, `dry-run --grep` matches the Scenario title only. `dry-run --grep 'Dialogs'` lists 0 tests where `run --grep 'Dialogs'` executes all 11. Never size a run from a dry-run's grep, and target a whole Feature by file path (`run tests/foo_test.ts`) when the selection must be exact.

Gherkin projects: `npx codeceptjs gherkin:steps -c <config>`.

Reference docs live under `node_modules/codeceptjs/docs/` — read them instead of guessing APIs.

## Report

Short prose summary. Must include:

- Env-driven values flagged as env-driven (`process.env.BROWSER || 'chromium'`, not just `'chromium'`)
- Conflicts flagged (static `show: true` vs `setHeadlessWhen(CI)`; `auth` configured but credential env vars missing)
- No config at root and no `--config` referenced → recommend `npx codeceptjs init .`, stop
- 3.x/CommonJS detected → recommend `migrate-codeceptjs-4`, stop
