---
name: codeceptjs-exploration
description: >
    Use when an agent needs to learn what's on a page in CodeceptJS — read the
    ARIA tree, inspect candidate elements, pick or disambiguate a stable locator.
    Drives the live browser via MCP `run_code` / `snapshot`. Invoked by
    writing-codeceptjs-tests, debugging-codeceptjs-tests, and
    refactoring-codeceptjs-tests whenever page inspection is needed.
---

# CodeceptJS Page Exploration

Authoring a test, debugging a failure, and refactoring a stale locator share one task: open a page, find the right element, pick a stable locator. This is that playbook.

## Tools

- **`run_code`** — runs CodeceptJS code, returns produced values, captures `console.*`, saves a final-state snapshot. For _do something and look at the result_.
- **`snapshot`** — captures state without acting (URL, cookies, localStorage, HTML, ARIA, screenshot, console). For "what's on the page right now".

Artifact sources, in preference order:

1. **ARIA snapshot** — structured, no styling noise, easy duplicate/accessibility-name scanning
2. **Screenshot** — visual confirmation; catches layout breaks ARIA can't show
3. **HTML** — only when ARIA lacks context (custom widgets without accessible names, attribute-driven behaviour)

## Inspect an element

`I.grabWebElement(locator)` → one WebElement; `I.grabWebElements(locator)` → array. Same cross-helper API on Playwright / Puppeteer / WebDriver.

| You want to …                            | Method                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Confirm rendered / visible / enabled     | `exists()`, `isVisible()`, `isEnabled()`                           |
| Read text / value / attribute / property | `getText()`, `getValue()`, `getAttribute(n)`, `getProperty(n)`     |
| Position on page                         | `getBoundingBox()` — flags offscreen / zero-sized                  |
| Rendered markup                          | `toOuterHTML()`, `toSimplifiedHTML(300)` (truncated, MCP-friendly) |
| Stable selector for a fix                | `toAbsoluteXPath()`                                                |
| Inside an iframe                         | `inIframe(async (body) => { ... })`                                |
| Drill into children                      | `$(loc)`, `$$(loc)`                                                |
| Browser-side function                    | `evaluate(fn, ...args)`                                            |

## Discover candidates when the obvious locator misses

When `Edit` matches nothing, the control may say "Change", carry `aria-label="Edit user"`, or live in `.btn-edit`. Cast a wide net with a permissive XPath via `I.grabWebElements`, then disambiguate.

OR together in the XPath:

- visible text — `text()` (or `.` for descendants)
- attributes — `@class`, `@aria-label`, `@title`, `@data-action`, `@id`
- **synonyms** — edit/change/modify; delete/remove/trash; submit/send/save

Case-insensitive via `translate(...)`:

```
//*[contains(translate(., 'EDIT', 'edit'), 'edit')
    or contains(translate(@class, 'EDIT', 'edit'), 'edit')
    or contains(translate(@aria-label, 'EDIT', 'edit'), 'edit')
    or contains(translate(., 'CHANGE', 'change'), 'change')]
```

Then iterate `toSimplifiedHTML(150)` over the results, pick the right candidate, commit a stable locator from its discriminating attribute or text.

## Pick a stable locator

Two decisions in order: **which region scopes the lookup** (context), **what identifies the element inside it**. Region first keeps the identifier short and semantic — the discriminator found during disambiguation belongs in the context argument:

```js
I.click('Edit user', '.user-row'); // ✅ region + what the user sees
I.click('#user-row-42 button.edit'); // ❌ same element, brittle, unreadable
```

Stable regions: landmarks (`nav`, `main`, `{ role: 'dialog' }`), app-shell containers (`.sidebar`, `.toolbar`, `.modal`), rows/cards identified by data via `locate(...)`. Identifier priority (full rationale: `codeceptjs-fundamentals` § Locators):

1. Visible label / accessible name — plain string already matches `aria-label`; don't expand to `{ css: '[aria-label="..."]' }`
2. ARIA role when ambiguous within context or role is part of the check
3. `$name` via `customLocator` when team test attributes exist
4. Composed CSS, still scoped: `I.click('button.edit', '#user-row-42')`
5. `toAbsoluteXPath()` — last resort; flag the team to add a `data-testid`

**Never commit an unverified locator** — confirm via `run_code` (`I.seeElement(loc, context)` or `grabWebElement(loc)`) that it matches exactly one element.

## Common patterns

- Strict mode 2+ matches → `grabWebElements('Save')` + `toSimplifiedHTML(200)` each, find discriminator, pass as context: `I.click('Save', '.modal')`
- Button rendered but doesn't act → `grabWebElement('Submit')` + `isEnabled()` + `getBoundingBox()` — disabled? offscreen? zero-sized?
- Wrong row in a list → `grabWebElements('.user-row')`, `getText()` per row to identify, `getAttribute('data-id')` for stable hook
- Inside iframe → `(await I.grabWebElement('iframe.editor')).inIframe(async (body) => body.$('button'))`

## Things to avoid

- Choosing a locator without seeing candidates first.
- Committing `toAbsoluteXPath()` when a semantic locator is available.
- Committing unscoped locators where a context keeps them short.
- Ignoring the screenshot — "exists in HTML" ≠ "user can see it".
- `usePlaywrightTo` / `useWebDriverTo` when WebElement methods cover it.

## Related skills

- `codeceptjs-fundamentals` — locator priority, await rule
- `writing-codeceptjs-tests` — invokes this during Mode B exploration
- `debugging-codeceptjs-tests` — invokes this for live inspection; offline variant via `codeceptq`
