import config from 'config';
import { serialize as serializeCookie } from 'cookie';
import type { ServerResponseFastifyReply } from '../types/FastifyReply';
import type { PatchedFastifyRequest } from '../types/PatchedHttpRequest';
import { assignExperiments } from './assign';
import { resolveConsent } from './consent';
import { experimentsEnabled, defaultRulesetProvider } from './ruleset';
import type { Ruleset } from './interfaces';

// Re-export the consent seam so a deployment can register its resolver at bootstrap.
export { setConsentResolver } from './consent';
export type { ConsentResolver, ConsentRequest } from './consent';

// Public surface: the onRequest hook calls `applyExperiments`. The ruleset comes from a
// swappable source ({@link RulesetProvider}) — currently a static-JSON config layer, with
// a remote experiment-management service as a later direction; the kill-switch stays config-driven
// (see `ruleset.ts`). Lower-level helpers (assign/bucket) stay module-private, imported by their specs.
export { ruleset, experimentsEnabled, defaultRulesetProvider } from './ruleset';
export type { Experiment, ExperimentAssignments, Ruleset, RulesetProvider } from './interfaces';

/** True when the edge reports https via `x-forwarded-proto` (first value wins). */
function forwardedProtoIsHttps(request: PatchedFastifyRequest): boolean {
    const header = request.raw.headers['x-forwarded-proto'];
    const value = Array.isArray(header) ? header[0] : header;
    return typeof value === 'string' && value.split(',')[0].trim().toLowerCase() === 'https';
}

/** Append one `Set-Cookie` header without clobbering cookies set earlier in the request. */
function appendSetCookie(reply: ServerResponseFastifyReply, serialized: string): void {
    const existing = reply.raw.getHeader('Set-Cookie');
    if (existing === undefined) {
        reply.raw.setHeader('Set-Cookie', serialized);
    } else if (Array.isArray(existing)) {
        reply.raw.setHeader('Set-Cookie', [...existing, serialized]);
    } else {
        reply.raw.setHeader('Set-Cookie', [String(existing), serialized]);
    }
}

/**
 * Resolve experiment assignments for the request and propagate them:
 *  - into `ilcState.experiments` (inlined into the page and forwarded to fragments via appProps);
 *  - as `Set-Cookie` headers so the assignment is sticky across the session.
 *
 * Designed to be called from the ILC `onRequest` hook. It must run *after* i18n
 * so it appends to, rather than overwrites, any cookie i18n already set.
 *
 * Honours the global kill-switch: when experiments are disabled nothing is assigned,
 * no session is minted, and `ilcState.experiments` is left unset — but any stale
 * `x-ab-*` cookie is still expired, so a visitor who was mid-experiment reverts to
 * control instead of keeping a readable variant cookie for up to 90 days. A visitor
 * with no such cookies stays fully inert (nothing written, response cacheable).
 *
 * Cookies get the `Secure` attribute when the site is served over https — per
 * `client.protocol`, OR when the edge reports https via `x-forwarded-proto` (a
 * TLS-terminating proxy in front of an http origin). This only ever *adds* `Secure`,
 * so a plain-http deployment still sets cookies, while an https edge never leaks the
 * session id over a non-secure attribute.
 *
 * When the response is personalized (a variant is assigned or a cookie is minted)
 * it is marked `Cache-Control: private, no-store` so a shared cache/CDN can't serve
 * one visitor's variant — or a single minted session id — to everyone. Without this
 * an upstream cache keyed on the URL would collapse the whole experiment.
 *
 * @param rulesetOverride test seam — defaults to the active {@link defaultRulesetProvider}.
 *   Read per call so a future provider with a live (background-synced) cache is picked up.
 */
export function applyExperiments(
    request: PatchedFastifyRequest,
    reply: ServerResponseFastifyReply,
    rulesetOverride: Ruleset = defaultRulesetProvider.getRuleset(),
): void {
    // i18n (which runs first) may already have redirected and flushed the response;
    // appending a Set-Cookie then would throw ERR_HTTP_HEADERS_SENT.
    if (reply.sent) {
        return;
    }

    request.raw.ilcState = request.raw.ilcState ?? {};

    const secure = config.get('client.protocol') === 'https' || forwardedProtoIsHttps(request);

    // Kill-switch: when disabled, resolve against an EMPTY ruleset. That assigns nothing
    // and mints no session, but still runs the orphan-cookie sweep in assignExperiments —
    // so a visitor who was mid-experiment gets their stale `x-ab-*` cookies expired and
    // reverts to control, rather than keeping a variant cookie alive for up to 90 days.
    const ruleset = experimentsEnabled() ? rulesetOverride : {};
    const { assignments, cookieDirectives } = assignExperiments(request.raw, ruleset, {
        secure,
        resolveConsent: (category) => resolveConsent(request.raw, category),
        // Raw request path (query stripped) for the first-touch `enrollment` gate.
        requestPath: request.raw.url?.split('?')[0],
    });

    // Only attach `experiments` when something was actually assigned — keeps the
    // no-active-experiments case inert end-to-end (no empty object downstream).
    if (Object.keys(assignments).length > 0) {
        request.raw.ilcState.experiments = assignments;
    }

    for (const directive of cookieDirectives) {
        appendSetCookie(reply, serializeCookie(directive.name, directive.value, directive.options));
    }

    // The response now varies per visitor (a resolved variant) or carries a freshly
    // minted session id — either way it must not be shared-cached.
    if (Object.keys(assignments).length > 0 || cookieDirectives.length > 0) {
        reply.raw.setHeader('Cache-Control', 'private, no-store');
    }
}
