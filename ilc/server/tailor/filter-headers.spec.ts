import chai from 'chai';

import { filterHeaders } from './filter-headers';
import { pickSharedRenderHeaders, type FragmentRenderOptions } from './fragment-render';

describe('filter headers', () => {
    it('should not return any headers due to security reasons when a fragment is public', () => {
        const attributes = {
            public: true,
        };

        const request = {
            headers: {
                'content-type': 'text/html',
                host: 'www.somewhere.com/host',
                'accept-language': 'en-US, en;q=0.5',
            },
        };

        chai.expect(filterHeaders(attributes, request)).to.be.eql({});
    });

    it('should not return any headers when request does not have any one', () => {
        const attributes = {
            public: false,
        };

        const request = {
            headers: {},
        };

        chai.expect(filterHeaders(attributes, request)).to.be.eql({});
    });

    it('should also forward headers listed in extraHeaders', () => {
        const attributes = { public: false };
        const request = {
            headers: {
                authorization: 'Bearer 12345',
                'x-custom-header': 'custom-value',
                'x-real-ip': '1.2.3.4',
                'content-type': 'text/html',
            },
        };

        chai.expect(filterHeaders(attributes, request, ['x-custom-header', 'X-Real-IP'])).to.be.eql({
            authorization: 'Bearer 12345',
            'x-custom-header': 'custom-value',
            'x-real-ip': '1.2.3.4',
        });
    });

    it('should not forward extraHeaders to public fragments', () => {
        const attributes = { public: true };
        const request = {
            headers: {
                'x-custom-header': 'custom-value',
            },
        };

        chai.expect(filterHeaders(attributes, request, ['x-custom-header'])).to.be.eql({});
    });

    it('should return only accepted and x-forwarded headers', () => {
        const attributes = {
            public: false,
        };

        const request = {
            headers: {
                authorization: 'Bearer 12345',
                'content-type': 'text/html',
                host: 'www.somewhere.com/host',
                'accept-language': 'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5',
                referer: 'www.somewhere.com/referer',
                'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
                'x-request-uri': 'www.somewhere.com/x-request-uri',
                'x-request-host': 'www.somewhere.com/x-request-host',
                cookie: 'yummy_cookie=choco; tasty_cookie=strawberry',
                'x-forwarded-cookie': 'yummy_cookie=choco; tasty_cookie=apple',
                'x-cookie': 'yummy_cookie=choco; tasty_cookie=orange',
                'cookie-x-forwarded': 'yummy_cookie=choco; tasty_cookie=banana',
                'x-cookie-forwarded': 'yummy_cookie=choco; tasty_cookie=lemon',
            },
        };

        chai.expect(filterHeaders(attributes, request)).to.be.eql({
            authorization: 'Bearer 12345',
            'accept-language': request.headers['accept-language'],
            referer: request.headers['referer'],
            'user-agent': request.headers['user-agent'],
            'x-request-uri': request.headers['x-request-uri'],
            'x-request-host': request.headers['x-request-host'],
            cookie: request.headers['cookie'],
            'x-forwarded-cookie': request.headers['x-forwarded-cookie'],
        });
    });

    describe('cacheable fragments (a header is forwarded only if its value is part of the cache key)', () => {
        const cacheableAttributes = {
            public: false,
        };
        const varyHeaders = pickSharedRenderHeaders({
            'x-request-host': 'www.somewhere.com',
            'x-request-intl': 'en-US:en-US:USD:USD',
        });
        const sharedRender: FragmentRenderOptions = { mode: 'shared', varyHeaders };

        const userIdentifyingHeaders = {
            authorization: 'Bearer 12345',
            cookie: 'yummy_cookie=choco; session=abc',
            'accept-language': 'fr-CH, fr;q=0.9',
            referer: 'www.somewhere.com/referer',
            'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
            'x-request-uri': 'www.somewhere.com/x-request-uri',
        };

        it('should forward exactly the given varyHeaders on a shared render, regardless of request.headers or extraHeaders', () => {
            // A shared render's headers come from the caller's already-computed varyHeaders (the
            // same value used to build the cache key), not from re-deriving them here — that's
            // what makes the cache key and the forwarded headers structurally unable to diverge.
            // pickSharedRenderHeaders' own filtering behavior (strips x-forwarded-*, keeps only
            // x-request-host/x-request-intl) is covered directly in request-fragment-cache.spec.ts.
            const request = {
                headers: {
                    ...userIdentifyingHeaders,
                    'x-forwarded-for': '203.0.113.7',
                },
            };

            chai.expect(filterHeaders(cacheableAttributes, request, ['x-custom-header'], sharedRender)).to.equal(
                varyHeaders,
            );
        });

        it('should keep full headers when cache is enabled but the render is not marked (e.g. wrapped-app recursion)', () => {
            // wrapperConf is nulled before the 210 re-request, so deriving cacheability from
            // attributes would strip user headers from a render that is never cached
            const attributes = {
                public: false,
                cache: { enabled: true, ttlSeconds: 300 },
                wrapperConf: null,
                forwardQuerystring: false,
            };

            const request = {
                headers: {
                    ...userIdentifyingHeaders,
                },
            };

            chai.expect(filterHeaders(attributes, request)).to.be.eql(userIdentifyingHeaders);
        });

        it('should keep current behavior when the render is not cacheable', () => {
            const attributes = {
                public: false,
            };

            const request = {
                headers: {
                    ...userIdentifyingHeaders,
                },
            };

            chai.expect(filterHeaders(attributes, request, undefined, { mode: 'private' })).to.be.eql(
                userIdentifyingHeaders,
            );
        });

        it('should still return no headers for public fragments even with cache enabled', () => {
            const attributes = {
                ...cacheableAttributes,
                public: true,
            };

            const request = {
                headers: {
                    'x-request-intl': 'en-US:en-US:USD:USD',
                },
            };

            chai.expect(filterHeaders(attributes, request, undefined, sharedRender)).to.be.eql({});
        });
    });
});
