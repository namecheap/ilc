---
name: debugging-codeceptjs-tests
description: >
    Use when a CodeceptJS 4 test fails, flakes, or behaves unexpectedly. Trigger
    on run errors and stack traces from `npx codeceptjs run`, intermittent
    failures, locator drift, timing issues, "works locally fails in CI", "why
    does this fail", trace/screenshot/console mentions, and breakpoint /
    step-through / "pause at step N" requests.
---

# Debugging CodeceptJS 4 Tests

Failures lie — the error usually points at a step that's a side effect of something earlier (auth expired, frame switch missed, network call pending). Reproduce, capture state, read it, then fix.

## Paths

- **MCP-first (AI agents)**: `run_test` / in-test `pause()` yield control to the agent on the same `I` / browser the test uses. Inspect via `run_code` / `snapshot`; step through via `run_step_by_step` + `continue`.
- **CLI fallback (humans / CI / framework internals)**: `--debug` → `--verbose` → `DEBUG="codeceptjs:*"`. The DEBUG escape hatch is only for framework-internal suspicion: recorder hangs, plugin races, event leaks, "step never ran". Namespaces: `codeceptjs:recorder`, `codeceptjs:pause`, `codeceptjs:ai`, `codeceptjs:plugin:<name>`.

`pause()` adapts to who's driving: TTY → readline REPL; MCP → yields control to the agent; non-TTY non-MCP subprocess → prints a notice and resolves (no CI deadlock).

## Workflow

1. **Fundamentals** — run `codeceptjs-fundamentals`: helper, plugins (`aiTrace`, `screenshot`, `pageInfo`, `retryFailedStep`, `pause`, `auth`), env vars, MCP availability. If `aiTrace` isn't declared, add it once: `plugins: { aiTrace: { enabled: true } }` — most of this skill leans on its output.
    - **Declare once; never edit config to change its trigger.** Override per-run with `-p aiTrace:on=step|fail|test|file|url` (fundamentals § Plugins from CLI). `on=fail` for lean CI repros, `on=step` while diagnosing. Flipping `on:` in config churns the repo and leaks into other runs.
2. **Reproduce minimally**: `npx codeceptjs run --grep '<scenario>' --steps`. Add `-c codecept.ci.conf.js` if CI-specific. Confirm reproduction before instrumenting.
3. **Pick tools**:
    - MCP `run_test <test>` — runs in-process; returns reporter result or `{ status: 'paused', pausedAfter, page, suggestions }`
    - MCP `run_step_by_step` + `continue` — pause after every step; for watching the whole flow
    - MCP `run_code` — arbitrary code in the live session; works fresh _and_ paused; returns produced values + console output + final-state snapshot
    - MCP `snapshot` — current browser state without acting (URL, cookies, storage, HTML, ARIA, screenshot, console)
    - MCP `list_actions` — sanity-check an `I.*` method exists
    - CLI `npx codeceptjs run --grep '<scenario>' --debug` — first move without MCP; `--verbose` adds promise-queue/retry/timeout logs
4. **Breakpoint**:
    - In-test `pause()` — best when already editing or breaking inside `within`/loop/hook
    - `pauseAt: N` on `run_test` — no test edit; pauses after the Nth leaf step
    - Find N: `npx codeceptjs dry-run --debug --grep '<scenario>' --numbers --no-ansi` (1-based, per-test; number of the line to stop _after_)
    - While paused: inspect with `run_code`, capture clean state with `snapshot`, walk prior steps in `output/trace_<TestName>_<hash>/trace.md`, release with `continue`
5. **Read the trace** — hand off to `codeceptjs-run-analysis`; focus on the **first** failed step — late failures are usually side effects of an earlier silent miss. It also covers grepping large HTML, clustering errors across traces, comparing reruns.
6. **Form a hypothesis**:

    | Symptom                                         | Likely cause                                                              |
    | ----------------------------------------------- | ------------------------------------------------------------------------- |
    | Element missing, page is `/login`               | Auth: stale session cache, missing env var                                |
    | Element in HTML but `display: none`             | `waitForVisible`, not `waitForElement`                                    |
    | Locator matches 2+ (strict mode)                | Scope it: context arg, then ARIA role, then `step.opts({ elementIndex })` |
    | Element present in screenshot N+1, missing in N | Animation / lazy load → `waitForVisible(loc, t)`                          |
    | 401/403 in console.json                         | API token expired or env var missing                                      |
    | Steps pass, next `I.see` fails                  | Frame switch missed → `within({ frame })`                                 |
    | Different result CI vs local                    | `setHeadlessWhen(CI)`, viewport, timing, env vars                         |
    | Recorder hangs, step never fires                | `DEBUG="codeceptjs:recorder"`                                             |
    | Plugin misbehaves                               | `DEBUG="codeceptjs:plugin:<name>"`                                        |

7. **Verify the fix on the live page** — try the candidate replacement step via `run_code` (works while paused, same `I`) **before editing the file**. Humans at a TTY get the same via in-test `pause()`.
8. **Apply and re-run**: edit, then `npx codeceptjs run --grep '<scenario>' --steps`; confirm via `codeceptjs-run-analysis` that the failure didn't shift steps. Leave a one-line `Why:` comment when the fix introduces `waitFor*` or `step.opts` — those comments are worth keeping.

## Query trace HTML with `codeceptq`

`aiTrace` writes per-step `<NNNN>_<step>_page.html` snapshots (one element per line — line numbers map 1:1 to elements). `codeceptq` resolves any CodeceptJS locator against a saved snapshot.

- **Never load page HTML into context manually** — snapshots are thousands of lines; `codeceptq` returns only matched elements with their line numbers.
- Test candidate locators offline before applying via `run_code` — a hit is a green light to try live, not a guarantee (visibility, re-renders).
- Multiple matches → don't write a brittler XPath; disambiguate with `step.opts({ elementIndex })` following the order `codeceptq` prints.

```bash
npx codeceptq '#submit-btn' --file output/trace_*/0007_*_page.html     # CSS
npx codeceptq 'Email' --field --file output/trace_*/0003_*_page.html   # semantic field
npx codeceptq 'Save' '.modal' --click --file output/trace_*/0005_*_page.html  # scoped clickable
npx codeceptq 'Username' --field --json --file ...                     # machine-readable
```

Key flags: `--field/--click/--checkable/--select` force semantic strategies; `--xpath`/`--css` override auto-detection (a bare tag name like `select.foo` is treated as fuzzy text); exit codes `0` match / `1` none / `2` invalid input.

> ⚠ **The `[context]` second positional does not scope** (CodeceptJS 4.1.0). It prints `N matches within '<ctx>'` but returns page-wide results — `lib/command/query.js` evaluates an absolute XPath (`//…`) against the context node, and `//foo` re-roots at the document. It will report a match inside a container that does not hold the element. To check a scoped locator offline, pass one composed selector (`codeceptq '.modal button[aria-label="Save"]'`) and compare its count against the unscoped form; a context-dependent locator is only truly verified by running the step.

## Inspect deeper

Hand off to `codeceptjs-exploration` when the trace says _what_ failed but you need more page-state detail ("is this button actually disabled?", "are there really two Save buttons?"). Debug-specific reaches:

- Button rendered but click had no effect → `grabWebElement('Submit')` + `isEnabled()` + `getBoundingBox()` (disabled? offscreen?)
- Strict-mode multi-match → exploration's broad-XPath iterate-and-disambiguate pattern
- Iframe content → wrap failing steps in `within({ frame })`

Prefer this over `usePlaywrightTo`/`useWebDriverTo` for inspection — same code across helpers, less boilerplate.

## Native helper escape hatch

Only when the `I.*` surface truly doesn't cover it (network interception, storage manipulation, helper-only APIs):

- Playwright: `I.usePlaywrightTo('label', async ({ browser, browserContext, page }) => { ... })`
- Puppeteer: `I.usePuppeteerTo('label', async ({ page }) => { ... })`
- WebDriver: `I.useWebDriverTo('label', async ({ browser }) => { ... })`

The label shows up in step output and traces. Works inside MCP `run_code` too. These couple tests to a specific helper — last resort.

## Helper gotchas

- Playwright: `strict: true` throws on multi-match; prefer `'load'`/`'domcontentloaded'` over `'networkidle'`; `trace: 'on'` → `output/trace.zip` (`npx playwright show-trace`)
- Puppeteer: `'networkidle0'` hangs on long-polling pages — use `'networkidle2'` or `'domcontentloaded'`
- WebDriver: `smartWait` covers actions only, not assertions; `executeScript` args must be JSON-serializable

## Auth-related failures

Redirect to `/login` mid-test or 401/403 in console → fix **auth**, not the failing step: check the plugin's `check`, credential env vars, and stale cached session under `output/<role>_session.json` (delete to force re-login). Full pattern in `codeceptjs-auth`.

## Flakiness and waits

Most "intermittent" failures are missed waits. Use trace HTML/ARIA to find the actual gating element instead of adding generic delay (fundamentals § Waiting has the mapping). `I.wait(N)` confirms a timing hypothesis while debugging — replace with the specific `waitFor*` before committing.

## Things to avoid

- Fixing from the error message without reading the trace.
- Editing the test before verifying the fix via `run_code`.
- Committing `pause()` calls — debugging tool only.
- Blind `waitFor*` instead of identifying the real gating element.
- Leaving `I.wait(N)` in committed tests.
- Editing `aiTrace`'s `on:` in config between runs — declare once, override per-run.
- Skipping the config check — `setHeadlessWhen(CI)` / env-driven URLs explain many "works locally fails in CI".
- Hiding failures with `retries` instead of fixing the cause.

## Related skills

- `codeceptjs-fundamentals` — effects, plugins-from-CLI, waiting rules
- `codeceptjs-exploration` — WebElement inspection, broad-XPath disambiguation
- `codeceptjs-run-analysis` — trace.md walking, error clustering, rerun comparison
- `codeceptjs-auth` — auth failure patterns
