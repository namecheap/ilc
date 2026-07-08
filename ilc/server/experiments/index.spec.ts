import { expect } from 'chai';
import { applyExperiments } from './index';
import { SESSION_COOKIE, abCookieName } from './assign';
import type { Ruleset } from './interfaces';

// Minimal fakes for the Fastify request/reply pair the onRequest hook passes in.
// We only exercise the bits `applyExperiments` touches: `request.raw` (cookies +
// ilcState) and `reply.raw` (the Set-Cookie header).
function makeRequest(cookie?: string) {
    return { raw: { headers: cookie ? { cookie } : {}, ilcState: undefined as any } } as any;
}

function makeReply(preset?: string | string[], sent = false) {
    const headers: Record<string, string | string[]> = {};
    if (preset !== undefined) {
        headers['Set-Cookie'] = preset;
    }
    return {
        sent,
        raw: {
            getHeader: (name: string) => headers[name],
            setHeader: (name: string, value: string | string[]) => {
                headers[name] = value;
            },
        },
        _headers: headers,
    } as any;
}

const setCookies = (reply: any): string[] => {
    const v = reply._headers['Set-Cookie'];
    return v === undefined ? [] : Array.isArray(v) ? v : [v];
};

const ruleset: Ruleset = {
    'homepage-hero': {
        status: 'active',
        variants: [
            { name: 'variant-a', weight: 50 },
            { name: 'variant-b', weight: 50 },
        ],
    },
};

describe('experiments/index applyExperiments', () => {
    it('writes resolved assignments onto request.raw.ilcState.experiments', () => {
        const request = makeRequest();
        applyExperiments(request, makeReply(), ruleset);

        expect(request.raw.ilcState).to.be.an('object');
        expect(request.raw.ilcState.experiments).to.have.property('homepage-hero');
        expect(['variant-a', 'variant-b']).to.include(request.raw.ilcState.experiments['homepage-hero']);
    });

    it('emits the session and per-experiment x-ab-* Set-Cookie headers', () => {
        const reply = makeReply();
        applyExperiments(makeRequest(), reply, ruleset);

        const cookies = setCookies(reply);
        expect(cookies.some((c) => c.startsWith(`${SESSION_COOKIE}=`))).to.equal(true);
        expect(cookies.some((c) => c.startsWith(`${abCookieName('homepage-hero')}=`))).to.equal(true);
    });

    it('appends to, rather than clobbers, a Set-Cookie already on the reply (e.g. i18n)', () => {
        const reply = makeReply('ilc-i18n=en-US%3AUSD; Path=/');
        applyExperiments(makeRequest(), reply, ruleset);

        const cookies = setCookies(reply);
        expect(cookies.some((c) => c.startsWith('ilc-i18n='))).to.equal(true);
        expect(cookies.some((c) => c.startsWith(`${SESSION_COOKIE}=`))).to.equal(true);
        expect(cookies.length).to.be.greaterThan(1);
    });

    it('marks cookies Secure (test config serves https via client.protocol)', () => {
        const reply = makeReply();
        applyExperiments(makeRequest(), reply, ruleset);
        // default/test config has client.protocol: 'https', so the flag must be present
        expect(setCookies(reply).every((c) => /;\s*Secure/i.test(c))).to.equal(true);
    });

    it('empty ruleset is fully inert: experiments left unset, no cookies', () => {
        const request = makeRequest();
        const reply = makeReply();
        applyExperiments(request, reply, {});

        // Unset (not an empty object) so nothing is merged into fragments or inlined.
        expect(request.raw.ilcState.experiments).to.equal(undefined);
        expect(setCookies(reply)).to.have.length(0);
    });

    it('does nothing when the reply was already sent (e.g. an i18n redirect)', () => {
        const request = makeRequest();
        const reply = makeReply(undefined, true); // reply.sent === true
        applyExperiments(request, reply, ruleset);

        expect(setCookies(reply)).to.have.length(0);
        expect(request.raw.ilcState?.experiments).to.equal(undefined);
    });

    describe('cache safety (no shared-cached variants)', () => {
        const cacheControl = (reply: any): string | undefined => reply._headers['Cache-Control'] as string | undefined;

        it('marks a personalized response private, no-store when a variant is assigned', () => {
            const reply = makeReply();
            applyExperiments(makeRequest(), reply, ruleset);
            expect(cacheControl(reply)).to.equal('private, no-store');
        });

        it('marks the response uncacheable even for a returning visitor with no new cookies', () => {
            // sticky cookie already present -> no Set-Cookie, but the page still varies by variant
            const reply = makeReply();
            applyExperiments(
                makeRequest(`${SESSION_COOKIE}=sid-1; ${abCookieName('homepage-hero')}=variant-b`),
                reply,
                ruleset,
            );
            expect(setCookies(reply)).to.have.length(0);
            expect(cacheControl(reply)).to.equal('private, no-store');
        });

        it('does NOT touch Cache-Control when nothing was assigned or set (page stays cacheable)', () => {
            const reply = makeReply();
            applyExperiments(makeRequest(`${SESSION_COOKIE}=sid-1`), reply, {});
            expect(cacheControl(reply)).to.equal(undefined);
        });
    });
});
