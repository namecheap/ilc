import type { ConsentState } from './interfaces';

/**
 * Vendor-neutral consent seam.
 *
 * ILC ships NO consent-vendor logic. A deployment that must gate experiments behind
 * consent registers a resolver that maps its own consent system (a cookie, header,
 * session lookup, geo rule, …) to a {@link ConsentState} for a given experiment
 * `consentCategory`. The category string is opaque to ILC.
 *
 * Fail-closed by default: with no resolver registered, {@link resolveConsent} returns
 * `unknown`, and assignment treats anything other than `granted` as "do not assign" —
 * so a categorised experiment never runs until a deployment wires up consent.
 */
export type ConsentRequest = { readonly headers: { readonly cookie?: string } };
export type ConsentResolver = (request: ConsentRequest, category: string) => ConsentState;

let registeredResolver: ConsentResolver | undefined;

/** Register the deployment's consent resolver (pass `undefined` to clear it). */
export function setConsentResolver(resolver: ConsentResolver | undefined): void {
    registeredResolver = resolver;
}

/**
 * Resolve consent for a category. Returns `unknown` when no resolver is registered or
 * the resolver throws — both treated as "not granted" (fail-closed) by assignment.
 */
export function resolveConsent(request: ConsentRequest, category: string): ConsentState {
    if (!registeredResolver) {
        return 'unknown';
    }
    try {
        return registeredResolver(request, category) ?? 'unknown';
    } catch {
        return 'unknown';
    }
}
