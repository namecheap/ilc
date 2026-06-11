import type { CookieOptions } from './interfaces';

// ILC mints its own session id (gateway-agnostic, ILC-public like `ilc-i18n`), so the
// feature works in OSS ILC without depending on any deployment's identity headers.
/** Stable per-visitor session id minted by ILC; seeds deterministic bucketing. */
export const SESSION_COOKIE = 'ilc-sid';

// Per-experiment sticky cookie `x-ab-<experiment-id>`. One cookie per experiment
// (rather than a single combined blob) so an experiment's assignment can be expired
// independently when it is paused or removed from the ruleset.
export const AB_COOKIE_PREFIX = 'x-ab-';

/** Cookie name carrying the resolved variant for a single experiment. */
export function abCookieName(experimentId: string): string {
    return `${AB_COOKIE_PREFIX}${experimentId}`;
}

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

// The session seed is HttpOnly: the client never needs to read the bucketing seed (it
// reads the resolved variant from the inlined ilcState / the x-ab-* cookie), so keeping
// this stable visitor id out of JS shrinks the XSS-exfiltration and variant-reroll
// surface. `Secure` is applied per request (see `withSecure`).
const SESSION_COOKIE_OPTIONS: CookieOptions = { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ONE_YEAR_SECONDS };
// Variant cookies are non-HttpOnly by design: the client may read them synchronously at
// bootstrap to stay consistent with the server-resolved variant (no hydration mismatch).
// Only a cache — the server still owns assignment via the ruleset, and a stored value is
// honoured only when it is a declared variant, so a tampered cookie can at worst force
// one harmless re-evaluation.
const AB_COOKIE_OPTIONS: CookieOptions = { httpOnly: false, sameSite: 'lax', path: '/', maxAge: NINETY_DAYS_SECONDS };
// maxAge 0 expires an existing cookie — used to remove a stored assignment.
const EXPIRE_COOKIE_OPTIONS: CookieOptions = { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 0 };

/** Apply the deployment-wide `secure` decision (true on https) to a base option set. */
function withSecure(base: CookieOptions, secure: boolean): CookieOptions {
    return { ...base, secure };
}

export const sessionCookieOptions = (secure: boolean): CookieOptions => withSecure(SESSION_COOKIE_OPTIONS, secure);
export const abCookieOptions = (secure: boolean): CookieOptions => withSecure(AB_COOKIE_OPTIONS, secure);
export const expireCookieOptions = (secure: boolean): CookieOptions => withSecure(EXPIRE_COOKIE_OPTIONS, secure);
