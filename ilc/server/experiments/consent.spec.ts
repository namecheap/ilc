import { expect } from 'chai';
import { resolveConsent, setConsentResolver } from './consent';

const req = (cookie?: string) => ({ headers: cookie ? { cookie } : {} });

describe('experiments/consent', () => {
    afterEach(() => setConsentResolver(undefined)); // reset module-level state between tests

    it('returns unknown when no resolver is registered (fail-closed)', () => {
        expect(resolveConsent(req(), 'performance')).to.equal('unknown');
    });

    it('delegates the decision to the registered resolver, per category', () => {
        setConsentResolver((_r, category) => (category === 'performance' ? 'granted' : 'denied'));
        expect(resolveConsent(req(), 'performance')).to.equal('granted');
        expect(resolveConsent(req(), 'targeting')).to.equal('denied');
    });

    it('passes the request through so a resolver can read its own consent signal', () => {
        setConsentResolver((r) => (r.headers.cookie?.includes('consent=ok') ? 'granted' : 'denied'));
        expect(resolveConsent(req('consent=ok'), 'x')).to.equal('granted');
        expect(resolveConsent(req('consent=no'), 'x')).to.equal('denied');
    });

    it('is fail-closed (unknown) when the resolver throws', () => {
        setConsentResolver(() => {
            throw new Error('consent backend down');
        });
        expect(resolveConsent(req(), 'x')).to.equal('unknown');
    });

    it('can be cleared back to fail-closed', () => {
        setConsentResolver(() => 'granted');
        setConsentResolver(undefined);
        expect(resolveConsent(req(), 'x')).to.equal('unknown');
    });
});
