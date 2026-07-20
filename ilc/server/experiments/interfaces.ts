/**
 * Type definitions for the ILC experiment-assignment layer.
 *
 * An "experiment" is an N-variant test. ILC resolves a single variant per
 * experiment, per visitor session, deterministically (see {@link ./bucket}),
 * and propagates the resolved assignments to every fragment via `appProps` and
 * to the browser via the inlined ILC state. See `docs/ab-testing.md`.
 */

/** Stable variant identifier surfaced to apps, e.g. `variant-a` | `variant-b`. */
export type VariantName = string;

/** Stable experiment identifier, e.g. `homepage-hero`. */
export type ExperimentId = string;

export interface ExperimentVariant {
    /** Variant identifier the app branches on. */
    readonly name: VariantName;
    /** Allocation weight. Weights within one experiment are expected to sum to 100. */
    readonly weight: number;
}

/**
 * `active`  — variants are bucketed and assigned.
 * `paused`  — experiment is ignored; visitors fall back to control (no assignment).
 */
export type ExperimentStatus = 'active' | 'paused';

/**
 * Consent decision for a category, resolved by a deployment-provided resolver.
 * `unknown` (no resolver, or resolver can't decide) is treated as "not granted".
 */
export type ConsentState = 'granted' | 'denied' | 'unknown';

/**
 * Optional gate on *first-time enrollment only*. When set, a visitor is bucketed into
 * the experiment (and gets the sticky `x-ab-<id>` cookie) only while requesting one of
 * the listed path prefixes. Visitors who never hit an enrollment path stay fully out of
 * the experiment — no assignment, no cookies.
 *
 * This is NOT a route-scoped experiment: once a visitor is enrolled, the stored
 * assignment is honoured on every route (the stored-cookie path is deliberately not
 * gated), so participation never toggles with navigation. The gate narrows *who joins
 * the population*, not *where the experiment applies*.
 *
 * Paths are matched as segment-aligned prefixes against the raw request path (query
 * string excluded, before any i18n un-localisation): `/shop` matches `/shop` and
 * `/shop/cart`, but not `/shopping`. Localised URL prefixes must be listed explicitly.
 * `/` is root-exact — it gates enrollment to the homepage only; to enroll everywhere,
 * omit `enrollment` entirely.
 */
export interface ExperimentEnrollment {
    readonly paths: readonly string[];
}

export interface Experiment {
    readonly status: ExperimentStatus;
    readonly variants: readonly ExperimentVariant[];
    /**
     * Optional, vendor-neutral consent gate. When set, the experiment is assigned only
     * if a deployment-registered consent resolver returns `granted` for this category
     * (see `./consent`). The category string is opaque to ILC — the deployment maps its
     * own consent system to it. With no resolver registered, a categorised experiment is
     * fail-closed (not assigned). Experiments without a category run unconditionally.
     */
    readonly consentCategory?: string;
    /**
     * Optional first-touch enrollment gate (see {@link ExperimentEnrollment}). Absent —
     * visitors enroll on any route, exactly as before this field existed.
     */
    readonly enrollment?: ExperimentEnrollment;
}

/** The complete set of experiments ILC knows about, keyed by experiment id. */
export type Ruleset = Readonly<Record<ExperimentId, Experiment>>;

/**
 * Source of the experiment {@link Ruleset} — the single, deliberate seam between *where
 * the ruleset comes from* and *how it is evaluated*. The assignment layer
 * ({@link ./assign}, {@link ./bucket}) only ever receives a resolved `Ruleset`; it never
 * reads configuration, so the source can be swapped without touching bucketing, consent,
 * or propagation.
 *
 * `getRuleset()` is synchronous on purpose: the ruleset lives in memory and is evaluated
 * locally per request with no network call. The current implementation reads a static
 * JSON layer ({@link ./StaticConfigRulesetProvider}); a provider backed by a remote
 * experiment-management service would keep its in-memory copy fresh out-of-band (SSE or polling) and
 * still answer `getRuleset()` synchronously from that cache.
 */
export interface RulesetProvider {
    getRuleset(): Ruleset;
}

/** Resolved variant per experiment for a single visitor session. */
export type ExperimentAssignments = Record<ExperimentId, VariantName>;

export interface CookieOptions {
    readonly httpOnly: boolean;
    readonly sameSite: 'lax' | 'strict' | 'none';
    readonly path: string;
    readonly maxAge: number;
    /**
     * Sets the `Secure` attribute. Driven by the external protocol (`client.protocol`):
     * on an https site the browser only sends these cookies over TLS. Left off in plain
     * http (e.g. local dev), where a `Secure` cookie would otherwise be dropped.
     */
    readonly secure?: boolean;
}

/** Options controlling how {@link assignExperiments} emits cookies. */
export interface AssignOptions {
    /** Emit cookies with the `Secure` attribute (true when the site is served over https). */
    readonly secure?: boolean;
    /**
     * Resolve consent for an experiment's declared `consentCategory`. When omitted, a
     * categorised experiment is treated as `unknown` (fail-closed, not assigned).
     * Experiments without a `consentCategory` ignore this entirely.
     */
    readonly resolveConsent?: (category: string) => ConsentState;
    /**
     * Path of the current request (no query string), used by the `enrollment` gate.
     * When omitted, enrollment-gated experiments are fail-closed for *new* visitors
     * (no first-time bucketing), while stored assignments are still honoured.
     */
    readonly requestPath?: string;
}

/** A cookie the caller must write to the response to persist assignment state. */
export interface CookieDirective {
    readonly name: string;
    readonly value: string;
    readonly options: CookieOptions;
}

export interface AssignmentResult {
    /** Stable per-visitor session id used as the bucketing seed. */
    readonly sessionId: string;
    /** Resolved variant for every active experiment. */
    readonly assignments: ExperimentAssignments;
    /** Cookies the caller must set on the response (empty when nothing changed). */
    readonly cookieDirectives: readonly CookieDirective[];
}
