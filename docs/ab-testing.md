# A/B testing — variant assignment

ILC can assign an A/B (or N-variant) experiment on the **server**, once per visitor,
before any fragment renders, and hand the result to every app on the page. Apps then
render the branch they were given — no flicker, no client-side flip.

This page is for two audiences:

- **Product / experiment owners** — start with _"What you can and can't do in Phase 1"_.
- **Developers** — the rest walks through defining an experiment, reading the variant,
  and how the pieces fit.

---

## What you can and can't do in Phase 1

**You can:**

- **Run an A/B or multi-variant test** (any number of variants, each with a traffic
  weight) that spans one page or several microfrontends on that page — every app in the
  request sees the **same** assignment, so a test can cover a whole funnel step.
- **Split traffic by percentage** (e.g. 50/50, or 34/33/33). Assignment is **random but
  stable**: a given visitor is put in a bucket once and **keeps that variant** for the
  life of the experiment (up to a year), across reloads and navigation.
- **Turn everything off instantly** with a global kill-switch (no deploy) — e.g. during
  an incident. Everyone reverts to the baseline.
- **Trust it not to break the site** — if anything about the experiment layer goes wrong,
  the visitor simply sees the baseline; the page still renders.
- **Add / pause / reweight experiments via configuration** (see below) rather than a code
  change to the assignment logic.

**You can't (yet) — deferred to later phases:**

- **Reach visitors who don't reload.** A newly launched or changed experiment reaches a
  visitor only on their **next full page load**. Long-lived single-page sessions won't
  pick it up until they reload — there's no live push (polling/streaming) yet. Read
  results knowing only reloading visitors were exposed.
- **Target an audience.** Assignment is a random split by visitor. There's no targeting
  by geography, campaign/UTM, new-vs-returning, logged-in status, or user attributes.
- **Self-serve from a UI.** Experiments are defined in configuration by an engineer;
  there is no management dashboard.
- **Coordinate overlapping experiments.** No mutual-exclusion / conflict rules — if two
  experiments touch the same surface, that's on the authors to avoid.
- **Get analytics out of the box.** ILC assigns and delivers the variant; **measuring**
  it (exposure/conversion events, dashboards) is the consuming app's/BI pipeline's job.
- **Assume consent handling.** Experiments are not gated on user consent unless a
  deployment wires that up (see _Consent_). Treat consent as a prerequisite before any
  production rollout in a regulated market.

---

## How a variant flows through a request

```
onRequest hook
  └─ applyExperiments(req, reply)
       ├─ assignExperiments(req, ruleset)              deterministic, cookie-sticky
       ├─ ilcState.experiments = { <id>: <variant> }   inlined as <script type="ilc-state">
       └─ Set-Cookie: ilc-sid, x-ab-<id>               sticky across the session
server router
  └─ merges ilcState.experiments into each fragment's appProps.experiments
```

ILC's `onRequest` hook is the single server-side point shared by every fragment, which
makes it the natural place to resolve a variant:

- **No flicker** — the variant is fixed before the first byte of HTML, so SSR'd fragments
  render the correct branch on first paint.
- **Cross-fragment consistency** — every fragment in the request gets the same map, so one
  experiment can span multiple microfrontends.
- **Fail-safe** — assignment is in-memory, never blocks the request, and on any error the
  visitor falls back to the baseline.

An app reads its variant from `appProps.experiments`. Because the value is resolved once
on the server and forwarded to the fragment for both its SSR render and its client
bootstrap, SSR and hydration agree.

---

## Defining an experiment

Experiments live in configuration under `experiments.ruleset`, keyed by experiment id —
so adding, pausing, or reweighting one is a config change, not a code edit. The OSS
baseline ships an **empty** ruleset (assign nothing) until a deployment opts in.

```json5
experiments: {
    enabled: true, // global kill-switch (see below)
    ruleset: {
        'homepage-hero': {
            status: 'active', // 'paused' → not assigned; everyone sees the baseline
            variants: [
                { name: 'variant-a', weight: 50 }, // baseline = the first variant
                { name: 'variant-b', weight: 50 }, // weights should sum to 100
            ],
        },
    },
}
```

Per-experiment knobs:

- **`variants`** — any number of named variants (not limited to two). `weight` is the
  percentage of traffic; weights should sum to 100. The **first** variant is the
  baseline / fallback.
- **`status`** — `active` assigns variants; `paused` sends everyone to the baseline
  without deleting the definition.
- **`consentCategory`** _(optional)_ — gate the experiment behind consent (see _Consent_).
- **`enrollment`** _(optional)_ — gate **first-time enrollment** by request path:
  `enrollment: { paths: ['/sample-nodejs'] }` recruits new participants only on the
  listed path prefixes (segment-aligned: `/shop` covers `/shop/cart`, not `/shopping`;
  `/` is root-exact — homepage only, since "everywhere" is expressed by omitting the
  field; matched against the raw request path, query excluded). Visitors who never hit
  an enrollment path get **nothing** — no assignment, no `x-ab-*` cookie, no `ilc-sid`.

    This is **not a route-scoped experiment**: once a visitor is enrolled, the stored
    assignment is honoured on every route — participation never toggles with navigation.
    The gate narrows _who joins the population_, not _where the experiment applies_.
    Route-scoped experiments (a variant turning on/off as the visitor navigates) are
    intentionally not supported.

`validateRuleset()` reports authoring mistakes (weights ≠ 100, a zero-weight/unreachable
variant, duplicate names, non-numeric/negative weights, an unknown `status`, a
cookie-unsafe id, or a malformed `enrollment` gate) without ever blocking startup. The ruleset source sits behind a small
`RulesetProvider` seam (`ruleset.ts`), so where the definitions come from is independent
of how they are evaluated.

### Supplying the ruleset from a plugin

Configuration is not the only source. A deployment that manages experiments elsewhere — a
management UI, a service, anything with a lifecycle of its own — can install an
`experimentsRuleset` plugin built with the
[ILC plugins SDK](https://github.com/namecheap/ilc-plugins-sdk){: target=\_blank} :octicons-link-external-16:
and have ILC evaluate the ruleset that plugin supplies instead:

```typescript
import { ExperimentsRulesetPlugin } from 'ilc-plugins-sdk';

const plugin: ExperimentsRulesetPlugin = {
    type: 'experimentsRuleset',
    getRuleset: () => cachedRuleset,
};
```

`getRuleset()` is called while a request is being resolved and is synchronous, so a plugin
must answer from memory and never perform I/O: keep the in-memory copy fresh out-of-band
(polling or SSE) and serve every call from it.

The plugin takes over only while it actually supplies experiments. An empty ruleset means
"nothing supplied", and ILC then reads `experiments.ruleset` from configuration — which is
what happens with no plugin installed, and also what keeps a plugin that has not filled its
copy yet from switching every experiment off at once. A plugin that throws is treated the
same way, so a page always renders.

---

## Reading the assigned variant in an app

Each fragment receives `appProps.experiments` — a plain map of `{ experimentId: variant }`.
An app can read it directly, or use the `useExperiment` hook shipped in the React
application library, which resolves the variant, tells you whether it's the baseline, and
defaults safely when the experiment is absent (kill-switch off, paused, or not yet
delivered). The value is a string the app branches on; ILC never renders app UI itself.

---

## A/A tests

An A/A test is an experiment whose variants are visually identical — define it like any
other and read it nowhere. Its only job is to validate the pipeline: a healthy A/A shows a
~50/50 split with no metric difference between buckets, confirming assignment and tracking
are unbiased _before_ you trust a real A/B result. Keep one as a standing sanity check.

---

## Determinism & stickiness

`bucketVariant` hashes `<sessionId>:<experimentId>` (SHA-256, via Node's built-in
`crypto`) into a bucket in `[0, 100)`; variants own contiguous weight slices. The same
session always lands in the same bucket on every instance and Node version, so a visitor
never flips variants, and growing one variant's weight only pulls in new visitors from the
slice boundary rather than reshuffling existing ones.

Assignment is therefore **first-touch sticky**: once a visitor has an `x-ab-<id>` cookie
they keep their variant, so changing weights mid-experiment only affects not-yet-assigned
visitors. Read results as a first-touch split, not the current weights. The `x-ab-<id>`
cookie is **re-issued on every request that honours it**, so its 90-day TTL is a sliding
inactivity window — participation persists as long as visits are less than 90 days apart
and never lapses mid-experiment for a returning visitor (which matters doubly for
enrollment-gated experiments, where a lapsed cookie would otherwise drop the visitor out
until they revisit an enrollment path).

---

## Global kill-switch

`experiments.enabled` (env: `ILC_EXPERIMENTS_ENABLED`) turns the whole layer off without a
deploy — set it to `false` and no one is assigned, no session id is minted, and every
visitor sees the baseline. It also **expires any existing `x-ab-*` cookies** so a visitor
who was mid-experiment reverts to control rather than keeping a stale variant. It defaults
to `true`.

---

## Consent (optional, vendor-neutral)

An experiment may declare a `consentCategory`. When set, the experiment is assigned only
if a deployment-registered **consent resolver** returns `granted` for that category:

```js
import { setConsentResolver } from '.../experiments';
setConsentResolver((request, category) => 'granted' | 'denied' | 'unknown');
```

ILC ships **no** consent-vendor logic — a deployment maps its own consent system to the
abstract category. It is **fail-closed**: with no resolver registered, a categorised
experiment does **not** run, and if consent is later withdrawn the sticky cookie is
expired. Experiments without a `consentCategory` run unconditionally.

---

## Cookies

| Cookie                 | TTL                                          | Purpose                                                     |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `ilc-sid`              | 1 year                                       | Stable per-visitor id ILC mints itself; the bucketing seed. |
| `x-ab-<experiment-id>` | 90 days (sliding — refreshed on every visit) | The resolved variant for one experiment.                    |

`ilc-sid` is **HttpOnly** (the client never needs the raw seed). The `x-ab-*` variant
cookies are readable by the client so it can stay consistent with the server-resolved
value. Both are `SameSite=Lax` and carry `Secure` when the site is served over https (per
`client.protocol`, or when the edge reports https via `x-forwarded-proto`). They are only a
cache — the server re-derives assignments from the ruleset every request, and a stored
value is honoured only when it is still a declared variant, so a tampered cookie can't
inject an arbitrary value into the page. A response is marked `Cache-Control: private,
no-store` whenever it carries an assignment or sets a cookie — and, while any
enrollment- or consent-gated experiment is **active**, on _every_ response: gated
experiments make personalized and baseline visitors share the same URLs, and a
shared-cached baseline would otherwise be served to enrolled visitors, silently masking
their variant. Deployments relying on shared/CDN caching of pages should budget for
that while a gated experiment runs.

---

## Limitations & roadmap

- **No live delivery to open sessions.** New/changed experiments reach a session only on
  its next full page load; a push mechanism (SSE/polling) is future work.
- **No audience targeting, no mutual-exclusion, no management UI** — see Phase 1 scope above.
- **Analytics is the app's responsibility.** ILC assigns and propagates; emitting
  exposure/conversion events (and any queue/retry) belongs to the consuming app.
- **No per-variant edge caching.** Experiment responses are `no-store`; a variant-aware
  cache key would be needed before edge-caching them.
- **Crawlers are assigned like any visitor.** A deployment that cares should bypass
  assignment for bots.

---

## Module layout — `ilc/server/experiments`

| File                    | Responsibility                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `bucket.ts`             | Deterministic SHA-256 bucketing (Node `crypto`).                                         |
| `assign.ts`             | `assignExperiments(request, ruleset)` — pure resolver → assignments + cookie directives. |
| `consent.ts`            | Vendor-neutral consent-resolver seam.                                                    |
| `cookies.ts`            | Cookie names + options (does not write cookies).                                         |
| `validate.ts`           | Ruleset sanity checks (advisory, never throws).                                          |
| `ruleset.ts` / provider | Resolves the ruleset source (plugin, else config) + the kill-switch.                     |
| `index.ts`              | `applyExperiments(request, reply)` — writes `ilcState.experiments` and `Set-Cookie`.     |
| `interfaces.ts`         | Shared types.                                                                            |

Unit tests live beside each module as `*.spec.ts` (chai + mocha).
