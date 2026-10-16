---
name: migrate-codeceptjs-4
description: 'Migrate a CodeceptJS 3.x project to 4.x. Trigger when `package.json` pins `codeceptjs` at 3.x or is missing `"type": "module"`, when test files still use CommonJS (`require()` / `module.exports`) against CodeceptJS APIs, when config references removed helpers (`Nightmare`, `Protractor`, `TestCafe`, `AI`, `SoftExpectHelper`, `Mochawesome`) or removed plugins (`autoLogin`, `tryTo`, `retryTo`, `eachElement`, `commentStep`, `fakerTransform`, `enhancedRetryFailedStep`, `allure`, `htmlReporter`, `wdio`, `selenoid`, `screenshotOnFail`, `pauseOnFail`, `stepByStepReport`), or when 3.x APIs are in use (`ai.request` function, Joi schemas in `seeResponseMatchesJsonSchema`, `restart: ''browser''`, `I.retry()`, `I.limitTime()`, Playwright `customLocators`).'
---

# Migrate CodeceptJS 3.x → 4.x

CodeceptJS 4 is **ESM-only and TypeScript-first**. There is no compatibility shim for CommonJS — every helper, page object, custom step, and config file must be ESM. This skill drives a project through the upgrade end-to-end.

The authoritative reference is `node_modules/codeceptjs/docs/migration-4.md` (after `npm install codeceptjs@4`). Read it once; this skill orchestrates the work and surfaces the parts agents miss.

## When to trigger

Detect _before_ acting. Look for any of:

- `package.json` lists `"codeceptjs": "^3"` / `"3.x"`, or has no `"type": "module"`.
- Tests, page objects, helpers, or config use `require()` / `module.exports` against CodeceptJS.
- Config still references removed helpers (`Nightmare`, `Protractor`, `TestCafe`, `AI`, `SoftExpectHelper`, `Mochawesome`) or removed plugins (`autoLogin`, `tryTo`, `retryTo`, `eachElement`, `commentStep`, `fakerTransform`, `enhancedRetryFailedStep`, `allure`, `htmlReporter`, `wdio`, `selenoid`, `screenshotOnFail`, `pauseOnFail`, `stepByStepReport`).
- 3.x APIs: `ai.request`, Joi schemas in `seeResponseMatchesJsonSchema`, `restart: 'browser'`, `I.retry()`, `I.limitTime()`, Playwright `customLocators`, `I.softExpect*` / `I.flushSoftAssertions`.
- `--reporter mochawesome` in scripts/CI, or `mochawesome` in `package.json` / `mocha.reporterOptions`.

If none of these hint at 3.x, the project is likely on 4.x already — hand back to `codeceptjs-fundamentals`.

## Workflow

Phases run in order. Commit at each boundary so any regression is bisectable.

### 1. Bump Node and CodeceptJS

- Confirm Node ≥ 16 (recommended 20+); update `engines.node` and CI runners.
- `npm install codeceptjs@4`.
- TypeScript projects: `npm install --save-dev tsx`. Replaces `ts-node/esm`, which now warns.

### 2. Convert the project to ESM

- Add `"type": "module"` to `package.json`. **Without this, every `.js` file parses as CommonJS and ESM imports throw at load time.**
- Convert config, page objects, custom helpers, custom steps, programmatic usage:
    - `const Helper = require('@codeceptjs/helper')` → `import Helper from '@codeceptjs/helper'`
    - `module.exports = X` → `export default X` (or named exports)
    - `const { codecept, container, event } = require('codeceptjs')` → `import codeceptjs, { container, event } from 'codeceptjs'`
- `Container.create()` and `Config.load()` are now async — `await` them.
- Files that genuinely need CJS (rare; usually third-party shims): rename to `.cjs`.

### 3. Remove or replace deleted helpers and plugins

| Old                                                            | Replacement                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Helper `Nightmare` / `Protractor` / `TestCafe`                 | `Playwright`, `Puppeteer`, or `WebDriver`.                                                                                 |
| Helper `AI`                                                    | Top-level `ai:` config + `aiTrace` plugin.                                                                                 |
| Helper `SoftExpectHelper`                                      | `import { hopeThat } from 'codeceptjs/effects'`; call `hopeThat.noErrors()` at end of scenario.                            |
| Helper `Mochawesome`                                           | **Stop and ask the user** — see "Mochawesome decision" below. Do not silently delete it.                                   |
| Plugin `autoLogin`                                             | `auth` plugin (see the `codeceptjs-auth` skill).                                                                           |
| Plugin `tryTo` / `retryTo`                                     | `import { tryTo, retryTo } from 'codeceptjs/effects'`                                                                      |
| Plugin `eachElement`                                           | `import { eachElement } from 'codeceptjs/els'`                                                                             |
| Plugin `commentStep`                                           | `import step from 'codeceptjs/steps'` → `step.section('name')` / `step.endSection()`                                       |
| Plugin `fakerTransform`                                        | `import { faker } from '@faker-js/faker'` directly in tests.                                                               |
| Plugin `enhancedRetryFailedStep`                               | Renamed to `retryFailedStep`.                                                                                              |
| Plugin `allure` / `htmlReporter`                               | `@testomatio/reporter` (HTML pipe). For JUnit XML, the `junitReporter` plugin.                                             |
| Plugin `wdio` / `selenoid`                                     | Configure via `helpers.WebDriver`, or run externally.                                                                      |
| Plugin `screenshotOnFail` / `pauseOnFail` / `stepByStepReport` | Renamed `screenshot` / `pause` / `screenshot` with `slides: true`. Old names still resolve but emit a deprecation warning. |

#### Mochawesome decision

The bundled `Mochawesome` **helper** is removed in 4.x (the helper class, the `mochawesome` dependency, and the worker report-dir wiring). The `mochawesome` **reporter** itself still works — it is a stock Mocha reporter and never needed CodeceptJS to bundle it.

This is a **user choice — do not pick for them**. When you detect Mochawesome (the helper in `helpers:`, `--reporter mochawesome`, or `mochawesome` in `package.json`/`mocha.reporterOptions`), stop and ask which path they want:

1. **Switch to `@testomatio/reporter` (recommended).** Richer HTML report (steps, screenshots, videos, traces), worker-safe, no helper or internal coupling. `npm install --save-dev @testomatio/reporter`, enable the `testomatio` plugin, run with `TESTOMATIO_DISABLE_UPLOAD=1`. For JUnit XML add the `junitReporter` plugin. This is the path to recommend.
2. **Keep Mochawesome — report only.** Remove the `Mochawesome` helper from `helpers:`, keep `npm i -D mochawesome` and `--reporter mochawesome --reporter-options reportDir=output`. Loses the auto-embedded failure screenshots the helper provided.
3. **Keep Mochawesome — with embedded screenshots.** Remove the helper from `helpers:` and re-create it as a **project-local custom helper** that wraps `mochawesome/addContext` (a faithful port is in the migration guide, section "Keeping Mochawesome"). Flag the two caveats: it imports non-semver-stable `codeceptjs/lib/*` internals (pin the version), and the screenshot-plugin filename sync is no longer automatic (set `uniqueScreenshotNames` identically on the helper and the `screenshot` plugin).

In all cases also: remove `mochawesome` report-dir handling from any custom worker scripts, and replace any reliance on `I.addMochawesomeContext()` (only option 3 keeps it).

Present options 1–3 explicitly and let the user decide before changing anything. Default the recommendation to option 1. The full reference (before/after configs + the custom-helper port) is in `node_modules/codeceptjs/docs/migration-4.md` → "Mochawesome → Testomat.io Reporter".

### 4. Update changed APIs

- **AI config** — delete the `request` function. Install Vercel AI SDK + provider (`npm install ai @ai-sdk/openai`) and set `ai: { model: openai('gpt-5') }`. Same shape for `@ai-sdk/anthropic`, `@ai-sdk/google`, etc.
- **JSON schemas** — `I.seeResponseMatchesJsonSchema()` now uses Zod, not Joi. Rewrite (`Joi.object().keys({...})` → `z.object({...})`, `Joi.string().required()` → `z.string()`, etc.) and `npm uninstall joi`.
- **Playwright** — replace `restart: 'browser'` with `'session'` (default), `'context'`, or `'keep'`. Drop `customLocators` config; use the `customLocator` plugin or ARIA locators (`{ role: 'button', name: 'Submit' }`).
- **`I.retry()` / `I.limitTime()`** — **removed** (not just deprecated). Replace with the step options API: `import step from 'codeceptjs/steps'`, then pass the config as the **last argument** of the step. `I.retry(3).click('Submit')` → `I.click('Submit', step.retry(3))`; `I.limitTime(10).fillField('Email', x)` → `I.fillField('Email', x, step.timeout(10))`. Also `step.opts({ elementIndex: 2 })`. Behavior is unchanged except the option no longer leaks onto the following step. `recorder.retry()` is unaffected (custom helpers only).
- **`within` and `session`** — no longer global. `import { within, session } from 'codeceptjs'` (or `within` from `codeceptjs/effects`). Both return Promises — `await` when you need the return value.
- **Subpath imports** — `codeceptjs/effects`, `codeceptjs/els`, `codeceptjs/steps`, `codeceptjs/store`, `codeceptjs/assertions`. See the migration guide for the full list.
- **`tryTo` / `hopeThat`** — return `Promise<boolean>` (the 3.x `Promise<T | false>` shape is gone).

### 5. Adopt `noGlobals: true`

3.x leaked `Helper`, `actor`, `inject`, `share`, `secret`, `locate`, `dataTable`, `within`, `session`, `codecept_dir`, `output_dir` as globals. 4.x defaults `noGlobals: true` in new configs and warns for projects without it. Add it to config and replace globals with explicit imports from `codeceptjs` / `@codeceptjs/helper`. Test-runner globals (`Feature`, `Scenario`, `Before`, `After`, `BeforeSuite`, `AfterSuite`, `pause`, `inject`, `share`) and BDD step-definition globals (`Given`, `When`, `Then`, `And`) **stay** — they're scope-injected by the runner.

### 6. Bump dependent packages

If your project depends directly on these, verify nothing breaks: `chai` (4 → 6, ESM-only), `chai-as-promised` (7 → 8), `commander` (11 → 14), `@faker-js/faker` (9 → 10), `chokidar` (4 → 5), `@cucumber/gherkin` (35 → 38), `webdriverio` (9.12 → 9.23). `joi` and `testcafe` are removed. See migration guide §7 for the full table.

### 7. Verify

Run, in order:

1. `npx codeceptjs check -c <config>` — surfaces config / helper / plugin / page object issues without spinning up a browser.
2. `npx codeceptjs run --debug` on a small smoke scenario. Confirm steps execute and the report is sane.
3. `npx codeceptjs run-workers 2` — confirms the worker event dispatcher fires per-test events the same way it does in single-process mode (4.x change).
4. TypeScript users: confirm error stack traces point at `.ts` source lines (proves `tsx` is loaded, not `ts-node/esm`).
5. Grep the repo for `tryTo(`, `retryTo(`, `eachElement(`, `commentStep(`, `softExpect`, `I.softExpect`, `Joi.`, `restart: 'browser'`, `I.retry(`, `I.limitTime(`, and (unless the user chose to keep it) `Mochawesome` / `--reporter mochawesome` — none should remain. `step.retry(` / `step.timeout(` passed as a step argument is the expected replacement, not a leftover.
6. If the project used `autoLogin`: confirm the `auth` plugin restores sessions and roles.

## Related skills

- `codeceptjs-auth` — replacement for the removed `autoLogin` plugin
- `codeceptjs-fundamentals` — run **after** migration to confirm wiring
- Full reference: `node_modules/codeceptjs/docs/migration-4.md`
