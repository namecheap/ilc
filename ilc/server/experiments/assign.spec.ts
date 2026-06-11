import { expect } from 'chai';
import { SESSION_COOKIE, abCookieName, assignExperiments } from './assign';
import type { Ruleset } from './interfaces';

const ruleset: Ruleset = {
    'homepage-hero': {
        status: 'active',
        variants: [
            { name: 'variant-a', weight: 50 },
            { name: 'variant-b', weight: 50 },
        ],
    },
};

const pausedRuleset: Ruleset = {
    'homepage-hero': { status: 'paused', variants: ruleset['homepage-hero'].variants },
};

const AB_COOKIE = abCookieName('homepage-hero');

// Build a request from a cookie name→value map (no cookies → empty headers).
const request = (cookies: Record<string, string> = {}): { headers: { cookie?: string } } => {
    const entries = Object.entries(cookies);
    return entries.length
        ? { headers: { cookie: entries.map(([name, value]) => `${name}=${value}`).join('; ') } }
        : { headers: {} };
};

const findDirective = (result: ReturnType<typeof assignExperiments>, name: string) =>
    result.cookieDirectives.find((directive) => directive.name === name);

describe('experiments/assign', () => {
    describe('first visit (no cookies)', () => {
        it('generates a session id and assigns every active experiment', () => {
            const result = assignExperiments(request(), ruleset);

            expect(result.sessionId).to.be.a('string').with.length.greaterThan(0);
            expect(result.assignments).to.have.property('homepage-hero');
            expect(['variant-a', 'variant-b']).to.include(result.assignments['homepage-hero']);
        });

        it('emits Set-Cookie directives for the session and a per-experiment x-ab-* cookie', () => {
            const result = assignExperiments(request(), ruleset);

            const sessionDirective = findDirective(result, SESSION_COOKIE);
            const abDirective = findDirective(result, AB_COOKIE);

            expect(sessionDirective).to.not.equal(undefined);
            expect(sessionDirective?.options.httpOnly).to.equal(true);
            expect(abDirective).to.not.equal(undefined);
            expect(abDirective?.value).to.equal(result.assignments['homepage-hero']);
        });
    });

    describe('returning visit (cookies present)', () => {
        it('reuses the existing session id and variant, emitting no new cookies', () => {
            const first = assignExperiments(request(), ruleset);
            const sessionId = first.sessionId;
            const variant = first.assignments['homepage-hero'];

            const second = assignExperiments(request({ [SESSION_COOKIE]: sessionId, [AB_COOKIE]: variant }), ruleset);

            expect(second.sessionId).to.equal(sessionId);
            expect(second.assignments).to.deep.equal(first.assignments);
            expect(second.cookieDirectives).to.have.length(0);
        });

        it('is stable across many re-evaluations of the same session', () => {
            const seed = assignExperiments(request(), ruleset);
            const variants = new Set<string>();
            for (let i = 0; i < 50; i++) {
                variants.add(
                    assignExperiments(request({ [SESSION_COOKIE]: seed.sessionId }), ruleset).assignments[
                        'homepage-hero'
                    ],
                );
            }
            expect(variants.size).to.equal(1);
        });
    });

    describe('paused experiments', () => {
        it('does not assign a variant for a paused experiment', () => {
            const result = assignExperiments(request(), pausedRuleset);
            expect(result.assignments).to.not.have.property('homepage-hero');
        });
    });

    describe('resilience', () => {
        it('does not throw on an empty ruleset', () => {
            const result = assignExperiments(request(), {});
            expect(result.assignments).to.deep.equal({});
        });

        it('skips a malformed experiment (missing variants) instead of throwing', () => {
            // Ruleset comes from untyped config; a missing variants array must not crash.
            const malformed = { broken: { status: 'active' } } as unknown as Ruleset;
            const result = assignExperiments(request(), malformed);
            expect(result.assignments).to.deep.equal({});
        });
    });

    describe('inert when nothing is assigned (non-breaking caching guarantee)', () => {
        // The OSS default ships an empty ruleset. A deployment not using experiments must
        // get NO ilc-sid cookie and NO personalization — otherwise applyExperiments would
        // force Cache-Control: private, no-store on every response and break CDN caching.
        it('mints no session cookie for a fresh visitor when the ruleset is empty', () => {
            const result = assignExperiments(request(), {});
            expect(result.assignments).to.deep.equal({});
            expect(result.cookieDirectives).to.have.length(0);
        });

        it('mints no session cookie when every experiment is paused', () => {
            const result = assignExperiments(request(), pausedRuleset);
            expect(result.cookieDirectives).to.have.length(0);
        });

        it('still mints the session cookie once an active experiment assigns', () => {
            const result = assignExperiments(request(), ruleset);
            expect(findDirective(result, SESSION_COOKIE)).to.not.equal(undefined);
        });
    });

    describe('consent gating (vendor-neutral seam)', () => {
        const gated: Ruleset = {
            'homepage-hero': {
                status: 'active',
                consentCategory: 'performance',
                variants: ruleset['homepage-hero'].variants,
            },
        };
        const granted = () => 'granted' as const;
        const denied = () => 'denied' as const;

        it('assigns when the resolver grants the category', () => {
            const result = assignExperiments(request(), gated, { resolveConsent: granted });
            expect(['variant-a', 'variant-b']).to.include(result.assignments['homepage-hero']);
        });

        it('does not assign when the resolver denies the category', () => {
            const result = assignExperiments(request(), gated, { resolveConsent: denied });
            expect(result.assignments).to.not.have.property('homepage-hero');
        });

        it('is fail-closed when no resolver is provided (categorised experiment skipped)', () => {
            const result = assignExperiments(request(), gated);
            expect(result.assignments).to.not.have.property('homepage-hero');
        });

        it('expires a previously-stored assignment when consent is no longer granted', () => {
            const result = assignExperiments(request({ [SESSION_COOKIE]: 'sid-1', [AB_COOKIE]: 'variant-b' }), gated, {
                resolveConsent: denied,
            });
            const expire = findDirective(result, AB_COOKIE);
            expect(expire?.options.maxAge).to.equal(0);
        });

        it('runs unconditionally when an experiment declares no consent category', () => {
            const result = assignExperiments(request(), ruleset, { resolveConsent: denied });
            expect(['variant-a', 'variant-b']).to.include(result.assignments['homepage-hero']);
        });
    });

    describe('cookie reconciliation against the ruleset (security)', () => {
        it('never propagates a tampered variant value — re-resolves to a declared variant', () => {
            const tampered = encodeURIComponent('</script><script>alert(1)</script>');
            const result = assignExperiments(request({ [SESSION_COOKIE]: 'sid-1', [AB_COOKIE]: tampered }), ruleset);
            // The injected string is discarded; only a ruleset-declared variant survives.
            expect(['variant-a', 'variant-b']).to.include(result.assignments['homepage-hero']);
        });

        it('only ever yields variant values declared by the ruleset', () => {
            const result = assignExperiments(request(), ruleset);
            for (const [experimentId, variant] of Object.entries(result.assignments)) {
                const declared = ruleset[experimentId].variants.map((v) => v.name);
                expect(declared).to.include(variant);
            }
        });

        it('ignores an x-ab-* cookie for an experiment not in the ruleset', () => {
            const result = assignExperiments(
                request({ [SESSION_COOKIE]: 'sid-1', [abCookieName('removed-experiment')]: 'whatever' }),
                ruleset,
            );
            expect(result.assignments).to.not.have.property('removed-experiment');
        });
    });

    describe('secure cookies', () => {
        it('omits the Secure attribute by default (plain http)', () => {
            const result = assignExperiments(request(), ruleset);
            for (const directive of result.cookieDirectives) {
                expect(directive.options.secure).to.not.equal(true);
            }
        });

        it('marks every emitted cookie Secure when secure:true (https)', () => {
            const result = assignExperiments(request(), ruleset, { secure: true });
            expect(result.cookieDirectives).to.have.length.greaterThan(0);
            for (const directive of result.cookieDirectives) {
                expect(directive.options.secure).to.equal(true);
            }
        });

        it('marks an expiry cookie Secure too, so https browsers accept the deletion', () => {
            const result = assignExperiments(
                request({ [SESSION_COOKIE]: 'sid-1', [abCookieName('gone')]: 'stale' }),
                ruleset,
                { secure: true },
            );
            const expire = findDirective(result, abCookieName('gone'));
            expect(expire?.options.secure).to.equal(true);
        });
    });

    describe('orphaned cookie cleanup', () => {
        it('expires an x-ab-* cookie for an experiment removed from the ruleset', () => {
            const result = assignExperiments(
                request({ [SESSION_COOKIE]: 'sid-1', [abCookieName('removed')]: 'variant-b' }),
                ruleset,
            );
            const expire = findDirective(result, abCookieName('removed'));
            expect(expire).to.not.equal(undefined);
            expect(expire?.value).to.equal('');
            expect(expire?.options.maxAge).to.equal(0);
        });

        it('expires an x-ab-* cookie for a paused experiment', () => {
            const result = assignExperiments(
                request({ [SESSION_COOKIE]: 'sid-1', [AB_COOKIE]: 'variant-b' }),
                pausedRuleset,
            );
            const expire = findDirective(result, AB_COOKIE);
            expect(expire?.options.maxAge).to.equal(0);
        });

        it('leaves the cookie of a live assignment untouched (no spurious expiry)', () => {
            const seed = assignExperiments(request(), ruleset);
            const variant = seed.assignments['homepage-hero'];
            const result = assignExperiments(
                request({ [SESSION_COOKIE]: seed.sessionId, [AB_COOKIE]: variant }),
                ruleset,
            );
            expect(findDirective(result, AB_COOKIE)).to.equal(undefined);
        });
    });
});
