import { expect } from 'chai';
import { collectLinkHosts, findUntrustedLinks, parseTrustedOrigins } from './trustedOrigins';

describe('overrideConfig/trustedOrigins', () => {
    const trustedOrigins = parseTrustedOrigins('example-cdn.com, *.example.com, example.net:8443');

    it('always trusts localhost and reports nothing for relative links and plain strings', () => {
        const value = {
            spaBundle: 'http://localhost:8080/x.js',
            cssBundle: '/relative/x.css',
            props: { title: 'Hello world', nested: ['relative/x.js'] },
        };
        expect(findUntrustedLinks(value, parseTrustedOrigins(undefined))).to.deep.equal([]);
    });

    it('reports the links ILC would remove, at any depth', () => {
        const value = {
            '@portal/one': {
                spaBundle: 'https://example-cdn.com/x.js',
                cssBundle: 'https://a.b.example.com/x.css',
                ssr: { src: 'https://example.net:8443/' },
                props: { links: ['https://attacker.example/x.js', 'https://example.net/x.js'] },
                bad: 'javascript:alert(1)',
            },
        };
        expect(findUntrustedLinks(value, trustedOrigins)).to.deep.equal([
            'https://attacker.example/x.js',
            'https://example.net/x.js',
            'javascript:alert(1)',
        ]);
    });

    it('does not match hosts which only start or end with a trusted origin', () => {
        const value = [
            'https://example-cdn.com.evil.example/x.js',
            'https://evilexample-cdn.com/x.js',
            'https://example.com/x.js',
        ];
        expect(findUntrustedLinks(value, trustedOrigins)).to.deep.equal(value);
    });

    it('trusts every origin with "all" left to the caller, and ignores malformed origins', () => {
        expect(parseTrustedOrigins('*, foo.*.com, , example-cdn.com').map((origin) => origin.hostname)).to.deep.equal([
            'example-cdn.com',
            'localhost',
        ]);
    });

    it('collects the distinct hosts of absolute links for the audit log', () => {
        const value = {
            a: 'https://example-cdn.com/x.js',
            b: 'https://example-cdn.com/y.js',
            c: 'http://localhost:8080/z.js',
            d: '/relative',
            e: 'plain text',
        };
        expect(collectLinkHosts(value)).to.deep.equal(['example-cdn.com', 'localhost:8080']);
    });
});
