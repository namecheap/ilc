---
name: writing-codeceptjs-tests
description: >
    Use when creating a new CodeceptJS 4 test, extending an existing Scenario, or
    porting a manual test plan to code. Builds tests against the live browser via
    the CodeceptJS MCP server — never from imagined locators or flows. Trigger on
    any request to create, write, add, draft, or scaffold a CodeceptJS test,
    login flow, end-to-end check, or "test from scratch".
---

# Writing CodeceptJS 4 Tests

A test that was never executed during authoring is unreliable. Drive the real browser via the CodeceptJS MCP server, verify every locator against the live page, commit only steps that passed.

Two modes, picked by how much of the flow you already know:

- **Mode A — incremental `run_code`**: send one or two `I.*` lines per call, read response, repeat. For extending existing tests, known flows, porting manual plans.
- **Mode B — scaffold-and-pause** (recommended for greenfield / unknown flows): write a stub Scenario containing `I.amOnPage('/...'); pause();`, run via MCP `run_test`. The browser opens and yields control at `pause()` — drive the live page via `run_code`, then replace `pause()` with the verified sequence.

Both share the same discovery / locator / commit steps; the difference is _where the in-flight exploration happens_.

## Workflow

1. **Fundamentals first** — run `codeceptjs-fundamentals`. You need: active web helper, base URL, plugins (`aiTrace`, `auth`), AI provider, page objects, env vars.
2. **Map what's already there** — `check` / `list` / `dry-run` (see fundamentals § Discover). Catches duplication and confirms no custom step or page-object method already covers the planned flow.
    - ⚠ `dry-run` does **not** initialize plugins: `Before(({ login }) => login('admin'))` raises "login is not a function" under dry-run even though a real run works. Inspect shape with `--steps`; ignore plugin-inject errors; verify auth with a real run.
3. **Auth** — path behind login → invoke the `codeceptjs-auth` skill. Existing role configured: `Before(({ login }) => login())`. Not configured: auth skill walks adding it. Public path: skip.
4. **Similar tests & page objects** — scan Scenarios in the feature area, POs under `include`, actor-file custom steps, data factories. If a PO method already encodes this area's locators, drive through it instead of raw `I.click` chains.
5. **Starting page** — a real URL _after_ any auth, not a guess; ask the user if unknown. Relative URLs only — host lives in the config (`helpers.Playwright.url` etc.).
6. **aiTrace + MCP wiring**:
    - Under MCP: `aiTrace` is forced on by the MCP server — nothing to configure.
    - CLI runs: _not_ auto-enabled — declare in config or pass `-p aiTrace`, or step 11 produces no `output/trace_*/` artifacts for run-analysis.
    - Run headless by default (`setHeadlessWhen(CI)` with `CI=1` exported, or `show: false`).
    - Confirm MCP client points at `node_modules/codeceptjs/bin/mcp-server.js` with `CODECEPTJS_CONFIG` and `CODECEPTJS_PROJECT_DIR` set.
7. **Open a live session** (pick mode):
    - Mode A: `run_code` scaffold — `login(<role>)` if needed, then `I.amOnPage(<start URL>)`. The response (URL, ARIA snapshot, screenshot, console) is ground truth for everything after.
    - Mode B: write a minimal-but-real draft in the test file:

        ```js
        Before(({ login }) => login('admin')); // if needed

        Scenario('draft - feature exploration', ({ I }) => {
            I.amOnPage('/dashboard');
            pause();
        });
        ```

        Run via MCP `run_test` → `{ status: 'paused', pausedAfter, page, suggestions }`. The test's own `I` / browser is now driven by `run_code`.

8. **Learn the page** — hand off to `codeceptjs-exploration`: ARIA snapshot first, HTML fallback, enumerate and disambiguate candidates, commit a locator only after verifying it matches exactly one element via `run_code`. In Mode B this happens inside the pause window.
9. **Build the Scenario** — one or two commands at a time via `run_code` into a scratchpad. After each ask: did URL/ARIA change as expected? New console errors? Do grabbed values match expectations?
    - Step failed → try a different locator, add a specific `waitFor*`, or reconsider the flow.
    - Genuinely ambiguous (two Save buttons, unclear empty state, possible feature flag) → **stop and ask the user**.
    - Optional UI elements (cookie banners) → `await tryTo(...)` instead of `if` (fundamentals § Effects) — keeps scenarios linear.
10. **Commit the verified sequence**:
    - Match existing naming; one `Feature` per file.
    - Use page-object methods / custom steps where they fit — don't duplicate selectors.
    - Translate every locator to readable form (priority below). Strict `{ css }` / `{ xpath }` in committed code are a review red flag unless nothing else fits.
    - Credentials from env vars only, wrapped in `secret(...)`.
    - Mode B: replace the `pause()` line with the sequence; rename `draft - ...` to the real intent.
11. **Final verification**: `npx codeceptjs run --grep '<scenario>' --steps` with aiTrace enabled → hand output to `codeceptjs-run-analysis` to confirm the flow ran clean in `output/trace_*/`. Done only when it passes there.

## Locator priority (writing time)

Always pass context — see `codeceptjs-fundamentals` § Locators for rationale. Top wins:

1. **Semantic string** — visible text, label, placeholder, `name`, `aria-label`: `I.click('Save', '.toolbar')`
2. **ARIA role** — text ambiguous within context ("Delete" link _and_ button), or role part of the assertion: `I.click({ role: 'button', name: 'Sign In' }, '#login-form')`
3. **`$name` via `customLocator`** — app exposes `data-testid`/`data-qa` broadly
4. **`locate()` builder** — structural conditions; often the structural half belongs in the context: `I.click('Edit', locate('tr').withText('Acme Corp'))`
5. **Strict `{ id }` / `{ name }` / `{ css }`** — last resorts above exhausted
6. **`{ xpath }`** — axes / text predicates the builder can't express

Writing-time specifics beyond fundamentals:

- Plain strings already match `aria-label` — never write `'aria-label=Save'` or `{ css: '[aria-label="Save"]' }`.
- Prefer stable contexts: landmarks (`nav`, `main`, `{ role: 'dialog' }`), app-shell containers (`.sidebar`, `.modal`), rows/cards identified by their data.
- **`I.see` / `I.dontSee` require a context** — their first arg is plain text matched across the whole page; unscoped they can false-pass on nav/footer content.
- Several matches → `step.opts({ elementIndex: N })` (1-based, negative, `'first'`/`'last'`) or `step.opts({ exact: true })`; import `step` from `codeceptjs/steps`.

## Waiting while authoring

- Auto-waiting covers interactions; detect gating elements (spinner overlay, post-fetch render) from the live HTML/ARIA between MCP steps → pick the stable selector and a specific `waitFor*`.
- `I.wait(N)` is acceptable **during authoring** to confirm a timing hypothesis — if a sleep makes the step pass, timing is the cause. Replace with the specific `waitFor*` before committing.

## Things to avoid

- Writing tests from imagined locators or routes — everything from the live page.
- Strict locators where semantic / ARIA / `locate()` fits.
- Long unscoped locators instead of short locator + context.
- Spelling out accessible names or repeating `[data-testid=...]` at call sites.
- Hardcoded credentials anywhere.
- Skipping the similar-test / page-object scan.
- `await` on plain action steps (fundamentals await rule); speculative `waitFor*` before checking auto-waiting.
- Leaving `I.wait(N)` or `pause()` in committed tests.
- Using Mode A for genuinely unknown flows — slower than Mode B, easier to lose state.
- Declaring done without the end-to-end aiTrace run.

## Related skills

- `codeceptjs-fundamentals` — rules, effects, discovery (run first)
- `codeceptjs-exploration` — page inspection, WebElement API
- `codeceptjs-auth` — login/session reuse
- `codeceptjs-run-analysis` — trace verification
- `debugging-codeceptjs-tests` — when the committed test misbehaves
