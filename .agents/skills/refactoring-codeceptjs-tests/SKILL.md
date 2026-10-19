---
name: refactoring-codeceptjs-tests
description: >
    Use when cleaning up existing CodeceptJS 4 tests — deduplication, extracting
    page objects, taming long locators, moving raw JS into custom helpers.
    Targeted (one file) or global (whole tests directory); always proposes before
    applying. Trigger on "refactor my tests", "clean up", "extract page object",
    "this test is too long", "deduplicate", or when reviewing test files for
    quality.
---

# Refactoring CodeceptJS 4 Tests

Suites rot in three predictable ways: duplicated UI flows copy-pasted across files, fat locators repeated everywhere, raw JS escaping into Scenarios. The fix for each is moving the pattern to its proper home without changing behaviour.

Works **targeted** (a file or Scenario the user named) or **global** (the whole configured `tests` glob). Either way: **propose first**, apply in reviewable batches after approval.

## Workflow

1. **Fundamentals** — run `codeceptjs-fundamentals`. You need: page objects under `include`, the actor file, custom helpers, auth roles. Without this you don't know where extractions land.
2. **Pick scope**:
    - Targeted — read once, propose, apply.
    - Global — multi-pass cycle: inventory → propose grouped → approve → apply a batch → re-run affected Scenarios → next batch. Never one big edit.
3. **Inventory** — flag:
    - Repeated `I.*` sequences across 2+ Scenarios
    - Locators used in 2+ places; multi-line XPath / deeply nested CSS
    - Unscoped locators carrying their own region (`'.sidebar nav a.settings'`), `'aria-label=X'` spellings, raw `[data-testid=...]` at call sites
    - Multi-statement `I.executeScript`; `usePlaywrightTo`/`usePuppeteerTo`/`useWebDriverTo` doing business work
    - Hardcoded credentials, URLs, magic strings
    - `I.wait(N)` and stray `await` on plain actions — fix while you're there
4. **Duplicate flows → page-object methods** named for user intent (`loginPage.signIn(email, pass)`, `cartPage.removeItem(name)`). Rule of three: extract at the second occurrence; one-off code stays put.
5. **Fat locators** — split before reaching for the builder: structural half becomes the context argument, rest stays a semantic string.
    - `I.click('.sidebar nav a.settings')` → `I.click('Settings', '.sidebar')`
    - `I.click({ css: '[aria-label="Save"]' })` → `I.click('Save', '.toolbar')`
    - `I.click({ css: '[data-qa=submit]' })` → `I.click('$submit', '.checkout')` with `customLocator`
      Only what survives the split needs `locate()`: used once → inline at call site; used 2+ times → named PO field with `.as('description')` so failures point at a meaningful name.
6. **Raw JS → custom helper** — `I.executeScript` blocks, `usePlaywrightTo` doing DOM walking or business logic, hand-rolled fetches inside Scenarios. Remember the fundamentals rule: **`I` does not exist inside a helper** — compose via `this.helpers['<Name>']`. Tests stay in the `I.*` vocabulary.
7. **Login duplication** — don't build a `loginPage.signIn` method. Hand off to `codeceptjs-auth`: that's what the `auth` plugin exists for. Login POs are a smell when session reuse applies.
8. **Site-wide actions** (`I.acceptCookies()`, `I.goToBilling()`) — actor file (`custom_steps.js`), not any single page's PO. Right home when no single page owns the action.

## Decision tree

| Pattern                                   | Where it goes                         |
| ----------------------------------------- | ------------------------------------- |
| UI flow on one page                       | Method on that page's PO              |
| UI flow spanning pages, site-wide         | Actor (`custom_steps.js`)             |
| Login                                     | `auth` plugin (see `codeceptjs-auth`) |
| Long locator carrying its own region      | Short semantic locator + context arg  |
| Long locator used once                    | `locate()` inline                     |
| Long locator used 2+ times                | `locate()` stored as PO field         |
| Raw browser API / file system / DB / mail | Custom helper                         |
| Test-data setup hitting an API            | REST helper + Data Object             |

## Propose, then apply

Group proposals by destination file (`pages/loginPage.js`, `helpers/DbHelper.js`, `tests/checkout_test.js`). Show the list before editing. In global mode: explicit approval, batches of three to five files, re-run after each batch:

```bash
npx codeceptjs run --grep '<scenario or feature>' --steps
```

Hand output to `codeceptjs-run-analysis` — confirm every affected Scenario still passes and no failure shifted to a new step. Refactors that don't run aren't refactors.

## Things to avoid

- Refactoring without re-running the affected Scenarios afterwards.
- Extracting a flow used only once — wait for the second occurrence.
- Renaming PO methods/fields without grepping every caller.
- A custom helper where a page object would do.
- Squashing distinct flows into one method (`loginPage.do(thing)` is a smell).
- Touching Scenario names or tags — CI and `--grep` reference them.
- Mass-applying in global mode without batching and re-running.

## Related skills

- `codeceptjs-fundamentals` — Main rule, Where things go, Architecture (`I`-unreachable rule)
- `codeceptjs-auth` — login deduplication
- `codeceptjs-run-analysis` — post-refactor verification
