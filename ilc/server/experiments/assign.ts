import { randomUUID } from 'node:crypto';
import { parse as parseCookieHeader } from 'cookie';
import { bucketVariant } from './bucket';
import {
    AB_COOKIE_PREFIX,
    SESSION_COOKIE,
    abCookieName,
    abCookieOptions,
    expireCookieOptions,
    sessionCookieOptions,
} from './cookies';
import type {
    AssignmentResult,
    AssignOptions,
    CookieDirective,
    Experiment,
    ExperimentAssignments,
    Ruleset,
} from './interfaces';

// Cookie names/options live in ./cookies; re-exported here as the layer's public surface.
export { SESSION_COOKIE, AB_COOKIE_PREFIX, abCookieName } from './cookies';

interface MinimalRequest {
    readonly headers: { readonly cookie?: string };
}

type ParsedCookies = Record<string, string | undefined>;

function readCookies(request: MinimalRequest): ParsedCookies {
    const header = request.headers.cookie;
    return header ? parseCookieHeader(header) : {};
}

// Segment-aligned prefix match: `/shop` covers `/shop` and `/shop/cart` but not
// `/shopping`. A configured prefix may carry a trailing slash; it is normalised away.
// `/` is deliberately root-exact (matches only the homepage): "enroll everywhere" is
// expressed by omitting `enrollment`, so `/` covering all paths would be redundant
// while making a homepage-only gate inexpressible. Root-exact means STRICT equality —
// this runs before any URL normalisation, so a raw `//domains` must not match `/`
// via the `startsWith('//')` shape of the generic prefix check below.
function pathMatchesPrefix(path: string, prefix: string): boolean {
    const normalised = prefix.endsWith('/') && prefix !== '/' ? prefix.slice(0, -1) : prefix;
    if (normalised === '/') {
        return path === '/';
    }
    return path === normalised || path.startsWith(`${normalised}/`);
}

/**
 * First-touch enrollment gate. Applies ONLY to visitors without a valid stored
 * assignment — the stored-cookie path above it is deliberately not gated, so an
 * enrolled visitor keeps their variant on every route (this is what makes the field an
 * enrollment gate and not a route-scoped experiment). Defensive like the rest of the
 * layer: a malformed `enrollment` value fails closed (no new enrollment) rather than
 * throwing, and an absent field enrolls everywhere (pre-existing behaviour).
 */
function isEnrollable(experiment: Experiment, requestPath: string | undefined): boolean {
    const enrollment = experiment.enrollment;
    if (enrollment === undefined) {
        return true;
    }
    if (!enrollment || !Array.isArray(enrollment.paths) || requestPath === undefined) {
        return false;
    }
    // Mirror the validator's rule at runtime: only non-empty, `/`-prefixed strings can
    // match. Validation merely WARNS about a malformed ruleset (the provider still loads
    // it), and without this check an empty-string prefix would match every path via
    // `startsWith('/')` — enrolling the whole site, the opposite of fail-closed.
    return enrollment.paths.some(
        (prefix) => typeof prefix === 'string' && prefix.startsWith('/') && pathMatchesPrefix(requestPath, prefix),
    );
}

/**
 * Resolve experiment variants for a single request.
 *
 * Pure and side-effect-free: it reads the per-experiment `x-ab-*` cookies off the
 * request, resolves a variant for every `active` experiment (reusing the stored
 * variant when it is still valid so returning visitors are stable), and returns
 * the assignments plus the cookie directives the caller must write. Assignment
 * never throws on bad input and never depends on a network call, satisfying the
 * "site functions normally when the experiment layer misbehaves" requirement.
 *
 * A stored variant is reused only when it is still a declared variant of that
 * experiment, so every value that leaves this function is ruleset-controlled — a
 * tampered cookie can never inject an arbitrary string into the assignments
 * (which are later inlined into the page), and a variant removed from the ruleset
 * is re-resolved rather than trusted.
 *
 * Any `x-ab-*` cookie that no longer maps to a live assignment (experiment paused
 * or removed from the ruleset) is expired, so stale assignments don't linger for
 * up to 90 days or resurrect if an id is reused.
 *
 * @param options.secure emit cookies with `Secure` (set when the site is https).
 */
export function assignExperiments(
    request: MinimalRequest,
    ruleset: Ruleset,
    { secure = false, resolveConsent, requestPath }: AssignOptions = {},
): AssignmentResult {
    const cookies = readCookies(request);

    const incomingSessionId = cookies[SESSION_COOKIE];
    const sessionId = incomingSessionId || randomUUID();

    // Null-prototype map: experiment ids come from the ruleset and cookie names, so a
    // key like `toString`/`constructor` must not collide with Object.prototype —
    // otherwise the `in` check in the cleanup sweep below would wrongly treat it as
    // an existing assignment.
    const assignments: ExperimentAssignments = Object.create(null);
    const cookieDirectives: CookieDirective[] = [];

    for (const [experimentId, experiment] of Object.entries(ruleset)) {
        // Defensive: the ruleset comes from an untyped source, so tolerate a malformed
        // entry (missing/empty variants, wrong status) by skipping it rather than
        // throwing — assignment must never break the request (the docstring contract).
        if (
            !experiment ||
            experiment.status !== 'active' ||
            !Array.isArray(experiment.variants) ||
            experiment.variants.length === 0
        ) {
            continue;
        }

        // Vendor-neutral consent gate. With a declared category, the experiment runs
        // only when the deployment's resolver returns `granted`; `denied`/`unknown`
        // (incl. no resolver) skip assignment, and the orphan sweep below expires any
        // previously-stored cookie so a withdrawn-consent visitor reverts to baseline.
        if (experiment.consentCategory) {
            const state = resolveConsent ? resolveConsent(experiment.consentCategory) : 'unknown';
            if (state !== 'granted') {
                continue;
            }
        }

        const stored = cookies[abCookieName(experimentId)];
        const isStoredVariantValid = stored !== undefined && experiment.variants.some((v) => v.name === stored);

        if (isStoredVariantValid) {
            assignments[experimentId] = stored as string;
            // Sliding refresh: re-issue the cookie so its Max-Age counts from the LAST
            // visit, not first touch. Without this, participation silently lapses after
            // 90 days — the visitor gets re-bucketed (a reweight could then flip their
            // variant), and an enrollment-gated visitor drops out of the experiment
            // entirely until they happen to revisit an enrollment path.
            cookieDirectives.push({
                name: abCookieName(experimentId),
                value: stored as string,
                options: abCookieOptions(secure),
            });
            continue;
        }

        // First-touch enrollment gate: below this line we are about to bucket a NEW
        // participant. Gated experiments recruit only on their enrollment paths; the
        // stored-assignment path above stays ungated so participation never toggles
        // with navigation (not a per-route experiment).
        if (!isEnrollable(experiment, requestPath)) {
            continue;
        }

        const variant = bucketVariant(sessionId, experimentId, experiment.variants);
        if (variant !== undefined) {
            assignments[experimentId] = variant;
            cookieDirectives.push({
                name: abCookieName(experimentId),
                value: variant,
                options: abCookieOptions(secure),
            });
        }
    }

    // Expire any `x-ab-*` cookie that didn't resolve to a live assignment this
    // request: experiment paused or removed from the ruleset.
    // Cookies backing a current assignment are in `assignments` and left untouched.
    for (const cookieName of Object.keys(cookies)) {
        if (!cookieName.startsWith(AB_COOKIE_PREFIX)) {
            continue;
        }
        const experimentId = cookieName.slice(AB_COOKIE_PREFIX.length);
        if (experimentId in assignments) {
            continue;
        }
        cookieDirectives.push({ name: cookieName, value: '', options: expireCookieOptions(secure) });
    }

    // Only persist a freshly-minted session id when it actually seeded an assignment.
    // A deployment with no active experiments (the OSS default ships an empty ruleset)
    // must stay fully inert — minting `ilc-sid` here would otherwise add a cookie and
    // force `Cache-Control: private, no-store` on every response, breaking shared/CDN
    // caching for installs that don't use experiments at all.
    if (!incomingSessionId && Object.keys(assignments).length > 0) {
        cookieDirectives.push({ name: SESSION_COOKIE, value: sessionId, options: sessionCookieOptions(secure) });
    }

    return { sessionId, assignments, cookieDirectives };
}
