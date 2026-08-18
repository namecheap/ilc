import { expect } from 'chai';
import sinon from 'sinon';
import zlib from 'zlib';
import { Readable } from 'stream';
import {
    composeCacheKey,
    isCacheableRequest,
    isCacheableResponse,
    wrapRequestFragmentWithCache,
    getCacheMarker,
} from './request-fragment-cache';
import { REFUSAL_REASONS } from './request-fragment-cache';
import type { RefusalReason } from './request-fragment-cache';
import { EvictingCacheStorage } from '../../common/EvictingCacheStorage';
import { pickSharedRenderHeaders } from './fragment-render';

const errors = require('./errors');

interface MockResponseOptions {
    statusCode?: number;
    headers?: Record<string, string | string[]>;
    body?: string;
    gzip?: boolean;
    contentEncoding?: string;
    errorMidStream?: boolean;
}

function makeFragmentResponse({
    statusCode = 200,
    headers = {},
    body = 'fragment-body',
    gzip = false,
    contentEncoding,
    errorMidStream = false,
}: MockResponseOptions = {}) {
    let payload = Buffer.from(body);
    if (gzip) {
        payload = zlib.gzipSync(payload);
        headers['content-encoding'] = contentEncoding ?? 'gzip';
    }

    const stream = new Readable({ read() {} });
    setImmediate(() => {
        if (errorMidStream) {
            stream.emit('error', new Error('socket hang up'));
            return;
        }
        stream.push(payload);
        stream.push(null);
    });

    return Object.assign(stream, { statusCode, headers });
}

function readBody(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        stream.on('error', reject);
    });
}

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('fragment cache guarantees (through the seam)', () => {
    const logger = { info: sinon.spy(), warn: sinon.spy(), error: sinon.spy(), debug: sinon.spy() };

    const cacheableAttributes = Object.freeze({
        id: 'app__at__slot',
        appProps: {},
        wrapperConf: null,
        forwardQuerystring: false,
        primary: false,
        timeout: 3000,
        cache: { enabled: true, ttlSeconds: 300 },
    });

    const makeRequest = (reqUrl = '/page') => ({
        headers: { 'x-request-intl': 'en-US:en-US:USD:USD', 'x-request-host': 'example.org' },
        registryConfig: { apps: {} },
        router: { getRoute: () => ({ basePath: '/', reqUrl }) },
    });

    let events: Array<{ event: string; appId: string }>;
    let clock: sinon.SinonFakeTimers | null = null;

    /**
     * Builds the cache through its only public seam. Capacity is injected rather than imported,
     * so the memory and single-flight guarantees are exercised with kilobytes and two slots
     * instead of production megabytes — same rules, milliseconds instead of seconds.
     */
    const makeWrapped = (
        innerFn: (...args: any[]) => Promise<any>,
        capacity: Record<string, number> = { maxConcurrentCaptures: 2, maxBodyBytes: 1024, maxTotalBodyBytes: 8192 },
    ) =>
        wrapRequestFragmentWithCache(innerFn as any, {
            logger: logger as any,
            capacity,
            onCacheEvent: (event, { appId }) => events.push({ event, appId }),
        });

    const drippingResponse = () => {
        const stream = new Readable({ read() {} });
        const interval = setInterval(() => stream.push('x'), 10);
        return {
            response: Object.assign(stream, { statusCode: 200, headers: {} }),
            stop: () => clearInterval(interval),
        };
    };

    beforeEach(() => {
        events = [];
    });

    afterEach(() => {
        logger.info.resetHistory();
        logger.error.resetHistory();
        clock?.restore();
        clock = null;
    });

    describe('memory bounds', () => {
        it('refuses a body over the size budget and still delivers it whole', async () => {
            const marker = 'END-OF-OVERSIZED';
            const payload = 'x'.repeat(4096) + marker; // 4× the injected 1 KiB cap
            let renders = 0;
            const wrapped = makeWrapped(async () => {
                renders += 1;
                return makeFragmentResponse({ body: payload });
            });

            const first = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const rendersAfterFirst = renders;
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            // an oversized body is never stored: every request renders live afterwards
            expect(renders, 'an oversized body must never be replayed from cache').to.be.greaterThan(rendersAfterFirst);
            expect(await readBody(first)).to.include(marker);
            expect(await readBody(second)).to.include(marker);
            expect(events.map((e) => e.event)).to.include('refuse');
        });

        it('caches a body just under the size budget', async () => {
            let renders = 0;
            const wrapped = makeWrapped(async () => {
                renders += 1;
                return makeFragmentResponse({ body: 'y'.repeat(512) });
            });

            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const attributes = { ...cacheableAttributes };
            const second = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(renders).to.equal(1);
            expect(getCacheMarker(attributes)).to.equal('hit');
            expect(await readBody(second)).to.have.length(512);
        });

        it('refuses to buffer beyond the concurrent-capture budget instead of growing memory', async () => {
            const release: Array<() => void> = [];
            let sharedRenders = 0;
            let privateRenders = 0;
            // only a shared render is buffered into the cache; a refused one is streamed privately
            const wrapped = makeWrapped((_url: string, _attrs: any, _req: any, renderOptions?: { mode: string }) => {
                if (renderOptions?.mode === 'shared') {
                    sharedRenders += 1;
                    return new Promise<any>((resolve) => {
                        release.push(() => resolve(makeFragmentResponse({ body: 'held' })));
                    });
                }
                privateRenders += 1;
                return Promise.resolve(makeFragmentResponse({ body: 'private' }));
            });

            // two slots are injected, so the third distinct key must not be buffered
            const inFlight = ['a', 'b', 'c'].map((key) =>
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest(`/${key}`)),
            );
            await flushAsync();

            expect(sharedRenders, 'only the budgeted number of captures may buffer').to.equal(2);
            expect(privateRenders, 'the surplus request still renders, just without buffering').to.equal(1);
            expect(events.filter((e) => e.event === 'refuse')).to.have.length(1);

            release.forEach((fn) => fn());
            await Promise.all(inFlight);
        });

        it('frees budget slots once captures settle', async () => {
            let renders = 0;
            const wrapped = makeWrapped(async () => {
                renders += 1;
                return makeFragmentResponse({ body: 'settled' });
            });

            for (let i = 0; i < 5; i++) {
                await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest(`/seq-${i}`));
            }

            expect(renders, 'sequential misses must never exhaust the budget').to.equal(5);
            expect(events.some((e) => e.event === 'refuse')).to.equal(false);
        });
    });

    describe('render deadline', () => {
        it('abandons a capture whose body never finishes and keeps serving later requests', async function () {
            this.timeout(15000);
            const dripping = drippingResponse();
            let attempt = 0;
            const wrapped = makeWrapped(async () => {
                attempt += 1;
                return attempt === 1 ? dripping.response : makeFragmentResponse({ body: 'recovered' });
            });

            try {
                await wrapped('http://apps.test/app', { ...cacheableAttributes, timeout: 30 }, makeRequest()).catch(
                    () => {},
                );

                const recovered = await wrapped(
                    'http://apps.test/app',
                    { ...cacheableAttributes, timeout: 30 },
                    makeRequest('/other'),
                );
                expect(await readBody(recovered)).to.equal('recovered');
            } finally {
                dripping.stop();
            }
        });

        it('does not let abandoned captures starve a healthy key', async function () {
            this.timeout(15000);
            const dripping = [drippingResponse(), drippingResponse()];
            let index = 0;
            const wrapped = makeWrapped(async () => {
                const current = dripping[index];
                index += 1;
                return current ? current.response : makeFragmentResponse({ body: 'healthy' });
            });

            try {
                // saturate both injected slots with captures that hang, then time out
                for (let i = 0; i < 2; i++) {
                    await wrapped(
                        'http://apps.test/app',
                        { ...cacheableAttributes, timeout: 30 },
                        makeRequest(`/hung-${i}`),
                    ).catch(() => {});
                }

                const healthy = await wrapped(
                    'http://apps.test/app',
                    { ...cacheableAttributes },
                    makeRequest('/healthy'),
                );
                expect(await readBody(healthy)).to.equal('healthy');
            } finally {
                dripping.forEach((d) => d.stop());
            }
        });

        it('does not tombstone a stale entry when a background refresh hits its render deadline', async function () {
            this.timeout(15000);
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            const dripping = drippingResponse();
            let attempt = 0;
            const wrapped = makeWrapped(async () => {
                attempt += 1;
                if (attempt === 1) return makeFragmentResponse({ body: 'render-1' });
                // only the second attempt (the one background refresh under test) hangs; any
                // further attempt must resolve normally so nothing is left dangling past this test
                if (attempt === 2) return dripping.response;
                return makeFragmentResponse({ body: 'render-3' });
            });
            const attributes = { ...cacheableAttributes, timeout: 30, cache: { enabled: true, ttlSeconds: 1 } };

            try {
                const first = await wrapped('http://apps.test/app', attributes, makeRequest());
                expect(await readBody(first)).to.equal('render-1');

                clock.tick(2000); // entry goes stale

                const stale = await wrapped('http://apps.test/app', attributes, makeRequest());
                expect(getCacheMarker(attributes)).to.equal('stale');
                expect(await readBody(stale)).to.equal('render-1');

                // wait out the real render deadline so the background refresh (attempt 2) hits it,
                // destroying the hung response and reporting stream-closed-early
                await new Promise((resolve) => setTimeout(resolve, 5200));

                // a deadline-driven abort must not have tombstoned the entry: still stale, old body intact
                const afterDeadline = await wrapped('http://apps.test/app', attributes, makeRequest());
                expect(getCacheMarker(attributes)).to.equal('stale');
                expect(await readBody(afterDeadline)).to.equal('render-1');

                // let the (normal, quick) third-attempt background refresh it triggered settle
                // before the test ends, so nothing bleeds into the next test
                await flushAsync();
            } finally {
                dripping.stop();
            }
        });
    });

    describe('single flight', () => {
        it('collapses concurrent misses on one key into a single render', async () => {
            let renders = 0;
            const wrapped = makeWrapped(async () => {
                renders += 1;
                await new Promise((resolve) => setTimeout(resolve, 30));
                return makeFragmentResponse({ body: 'deduped' });
            });

            const responses = await Promise.all([
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
            ]);

            expect(renders).to.equal(1);
            for (const response of responses) {
                expect(await readBody(response)).to.equal('deduped');
            }
        });

        it('does not attach a new deadline timer for every stale hit while a refresh is in flight', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            const dripping = drippingResponse();
            let attempt = 0;
            const wrapped = makeWrapped(async () => {
                attempt += 1;
                return attempt === 1 ? makeFragmentResponse({ body: 'fresh' }) : dripping.response;
            });
            const attributes = { ...cacheableAttributes, timeout: 30, cache: { enabled: true, ttlSeconds: 1 } };
            const setTimeoutSpy = sinon.spy(global, 'setTimeout');

            try {
                await wrapped('http://apps.test/app', attributes, makeRequest());
                clock.tick(2000);
                setTimeoutSpy.resetHistory();

                await Promise.all(
                    Array.from({ length: 20 }, () => wrapped('http://apps.test/app', attributes, makeRequest())),
                );

                // withTimeout schedules exactly one deadline timer at request.timeoutMs (30 + 5000ms
                // slack); an extra join per stale hit would inflate this well past 1
                const deadlineTimers = setTimeoutSpy.getCalls().filter((call) => call.args[1] === 5030);
                expect(deadlineTimers).to.have.length(1);
            } finally {
                setTimeoutSpy.restore();
                dripping.stop();
            }
        });
    });

    describe('refusal lifetime', () => {
        it('stops honouring a refusal once its short ceiling passes, even with a long ttl', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            let dynamic = true;
            let renders = 0;
            const wrapped = makeWrapped(async () => {
                renders += 1;
                return dynamic
                    ? makeFragmentResponse({ headers: { 'cache-control': 'no-store' }, body: 'dynamic' })
                    : makeFragmentResponse({ body: 'static-again' });
            });

            const longTtl = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 24 * 60 * 60 } };
            await wrapped('http://apps.test/app', { ...longTtl }, makeRequest());
            const rendersAfterRefusal = renders;

            dynamic = false;
            // past the refusal ceiling but nowhere near the configured day-long ttl
            clock.tick(61_000);

            await wrapped('http://apps.test/app', { ...longTtl }, makeRequest());
            const attributes = { ...longTtl };
            const hit = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(renders, 'the fragment must be probed again after the refusal expires').to.be.greaterThan(
                rendersAfterRefusal,
            );
            expect(getCacheMarker(attributes)).to.equal('hit');
            expect(await readBody(hit)).to.equal('static-again');
        });

        it('keeps honouring a refusal while a short ttl has not elapsed', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            let renders = 0;
            const wrapped = makeWrapped(async () => {
                renders += 1;
                return makeFragmentResponse({ headers: { 'cache-control': 'no-store' }, body: 'dynamic' });
            });

            const shortTtl = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 10 } };
            await wrapped('http://apps.test/app', { ...shortTtl }, makeRequest());
            const rendersAfterFirst = renders;

            clock.tick(500);
            await wrapped('http://apps.test/app', { ...shortTtl }, makeRequest());

            expect(renders).to.equal(rendersAfterFirst + 1);
            expect(events.filter((e) => e.event === 'refuse').length).to.be.greaterThan(0);
        });
    });

    describe('capacity budget contract', () => {
        it('rejects a budget whose concurrent captures could exceed the total byte ceiling', () => {
            expect(() =>
                makeWrapped(async () => makeFragmentResponse(), {
                    maxConcurrentCaptures: 32,
                    maxBodyBytes: 1024 * 1024,
                    maxTotalBodyBytes: 1024,
                }),
            ).to.throw(/capacity budget violated/i);
        });

        it('rejects a non-positive budget value', () => {
            expect(() => makeWrapped(async () => makeFragmentResponse(), { maxConcurrentCaptures: 0 })).to.throw(
                /positive integer/i,
            );
        });
    });
});

describe('request-fragment-cache helpers', () => {
    describe('composeCacheKey', () => {
        const base = {
            fragmentUrl: 'http://apps.test/primary',
            attributes: { id: 'app__at__slot', appProps: { theme: 'light' } },
            route: { basePath: '/', reqUrl: '/page' },
            varyHeaders: pickSharedRenderHeaders({
                'x-request-host': 'example.org',
                'x-request-intl': 'en-US:USD',
            }),
        };

        it('should return a stable key for identical inputs', () => {
            expect(composeCacheKey({ ...base })).to.equal(composeCacheKey({ ...base }));
        });

        it('should return different keys for different intl values', () => {
            expect(composeCacheKey({ ...base })).to.not.equal(
                composeCacheKey({
                    ...base,
                    varyHeaders: pickSharedRenderHeaders({
                        ...base.varyHeaders,
                        'x-request-intl': 'ua-UA:UAH',
                    }),
                }),
            );
        });

        it('should return different keys for different domains', () => {
            expect(
                composeCacheKey({
                    ...base,
                    varyHeaders: pickSharedRenderHeaders({
                        ...base.varyHeaders,
                        'x-request-host': 'foo.example.org',
                    }),
                }),
            ).to.not.equal(
                composeCacheKey({
                    ...base,
                    varyHeaders: pickSharedRenderHeaders({
                        ...base.varyHeaders,
                        'x-request-host': 'bar.example.org',
                    }),
                }),
            );
        });

        it('should return different keys for different appProps (e.g. experiments variants)', () => {
            expect(
                composeCacheKey({ ...base, attributes: { ...base.attributes, appProps: { variant: 'A' } } }),
            ).to.not.equal(
                composeCacheKey({ ...base, attributes: { ...base.attributes, appProps: { variant: 'B' } } }),
            );
        });

        it('should return different keys for different routes', () => {
            expect(composeCacheKey({ ...base, route: { basePath: '/', reqUrl: '/page' } })).to.not.equal(
                composeCacheKey({ ...base, route: { basePath: '/', reqUrl: '/other' } }),
            );
        });

        it('should be blind to the query string in reqUrl', () => {
            expect(
                composeCacheKey({ ...base, route: { basePath: '/', reqUrl: '/page?utm_source=facebook' } }),
            ).to.equal(composeCacheKey({ ...base, route: { basePath: '/', reqUrl: '/page?utm_source=google' } }));
        });

        it('should not collide when field values shift between fields', () => {
            expect(
                composeCacheKey({
                    ...base,
                    varyHeaders: pickSharedRenderHeaders({ 'x-request-host': 'b:c', 'x-request-intl': 'd' }),
                }),
            ).to.not.equal(
                composeCacheKey({
                    ...base,
                    varyHeaders: pickSharedRenderHeaders({ 'x-request-host': 'b', 'x-request-intl': 'c:d' }),
                }),
            );
        });

        it('should treat missing intl as a distinct stable value', () => {
            const { ['x-request-intl']: ignored, ...withoutIntl } = base.varyHeaders;
            const selectedWithoutIntl = pickSharedRenderHeaders(withoutIntl);
            expect(composeCacheKey({ ...base, varyHeaders: selectedWithoutIntl })).to.equal(
                composeCacheKey({ ...base, varyHeaders: selectedWithoutIntl }),
            );
            expect(composeCacheKey({ ...base, varyHeaders: selectedWithoutIntl })).to.not.equal(
                composeCacheKey({ ...base }),
            );
        });
    });

    describe('isCacheableRequest', () => {
        const cacheableAttributes = Object.freeze({
            id: 'app__at__slot',
            cache: { enabled: true, ttlSeconds: 300 },
            wrapperConf: null,
            forwardQuerystring: false,
            primary: false,
        });
        const validRoute = Object.freeze({});
        const validVaryHeaders = pickSharedRenderHeaders({ 'x-request-host': 'example.org' });

        it('should return false when cache config is absent (opt-in, AC#1)', () => {
            const { cache, ...rest } = cacheableAttributes;
            expect(isCacheableRequest(rest, validRoute, validVaryHeaders)).to.equal(false);
        });

        it('should return false when cache is disabled', () => {
            expect(
                isCacheableRequest({ ...cacheableAttributes, cache: { enabled: false } }, validRoute, validVaryHeaders),
            ).to.equal(false);
        });

        it('should return true when cache is enabled', () => {
            expect(isCacheableRequest(cacheableAttributes, validRoute, validVaryHeaders)).to.equal(true);
        });

        it('should return false when cache is enabled without a valid ttlSeconds (registry contract)', () => {
            for (const ttlSeconds of [undefined, 0, -1, 1.5, '300', 2592001]) {
                expect(
                    isCacheableRequest(
                        { ...cacheableAttributes, cache: { enabled: true, ttlSeconds } as any },
                        validRoute,
                        validVaryHeaders,
                    ),
                    `ttlSeconds=${ttlSeconds}`,
                ).to.equal(false);
            }
        });

        it('should accept the maximum 30 day ttlSeconds at runtime', () => {
            expect(
                isCacheableRequest(
                    { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 2592000 } },
                    validRoute,
                    validVaryHeaders,
                ),
            ).to.equal(true);
        });

        it('should return false for wrapped apps (wrapperConf present)', () => {
            expect(
                isCacheableRequest(
                    {
                        ...cacheableAttributes,
                        wrapperConf: { appId: 'wrapper__at__slot', src: 'http://apps.test/wrapper' },
                    },
                    validRoute,
                    validVaryHeaders,
                ),
            ).to.equal(false);
        });

        it('should return false when forwardQuerystring is enabled', () => {
            expect(
                isCacheableRequest({ ...cacheableAttributes, forwardQuerystring: true }, validRoute, validVaryHeaders),
            ).to.equal(false);
        });

        it('should return true for primary fragments (they are cacheable)', () => {
            const primaryFragmentAttributes = { ...cacheableAttributes, primary: true };
            expect(isCacheableRequest(primaryFragmentAttributes, validRoute, validVaryHeaders)).to.equal(true);
        });

        it('should return false for a special route (404 etc.)', () => {
            expect(isCacheableRequest(cacheableAttributes, { specialRole: 404 }, validVaryHeaders)).to.equal(false);
        });

        it('should return false when x-request-host is absent', () => {
            expect(isCacheableRequest(cacheableAttributes, validRoute, pickSharedRenderHeaders({}))).to.equal(false);
        });
    });

    describe('pickSharedRenderHeaders', () => {
        it('should forward only x-request-intl and x-request-host', () => {
            expect(
                pickSharedRenderHeaders({
                    authorization: 'Bearer 12345',
                    cookie: 'yummy_cookie=choco; session=abc',
                    'x-request-host': 'www.somewhere.com',
                    'x-request-intl': 'en-US:en-US,ua-UA:USD:USD,UAH',
                }),
            ).to.eql({
                'x-request-host': 'www.somewhere.com',
                'x-request-intl': 'en-US:en-US,ua-UA:USD:USD,UAH',
            });
        });

        it('should strip all x-forwarded-* headers', () => {
            expect(
                pickSharedRenderHeaders({
                    'x-forwarded-for': '203.0.113.7',
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'evil.example.org',
                    'x-request-host': 'www.somewhere.com',
                }),
            ).to.eql({
                'x-request-host': 'www.somewhere.com',
            });
        });

        it('should return an empty object when no shared-render headers are present', () => {
            expect(pickSharedRenderHeaders({ 'x-custom-header': 'custom-value' })).to.eql({});
        });
    });

    describe('isCacheableResponse', () => {
        it('should return true for a plain 200 response', () => {
            expect(isCacheableResponse(200, { 'content-type': 'text/html' })).to.equal(true);
        });

        it('should return false for non-200 status codes (AC#4)', () => {
            for (const statusCode of [201, 204, 210, 301, 302, 404, 500, 503]) {
                expect(isCacheableResponse(statusCode, {}), `statusCode=${statusCode}`).to.equal(false);
            }
        });

        it('should return false when response sets cookies (personalization signal, AC#3)', () => {
            expect(isCacheableResponse(200, { 'set-cookie': ['session=abc'] })).to.equal(false);
        });

        it('should return false when fragment opts out via Cache-Control: no-store (AC#2)', () => {
            expect(isCacheableResponse(200, { 'cache-control': 'no-store' })).to.equal(false);
            expect(isCacheableResponse(200, { 'cache-control': 'No-Store, max-age=0' })).to.equal(false);
        });

        it('should return false when fragment opts out via Cache-Control: private (AC#2)', () => {
            expect(isCacheableResponse(200, { 'cache-control': 'private' })).to.equal(false);
        });

        it('should refuse directives that forbid reuse without revalidation (RFC 9111)', () => {
            for (const value of [
                'no-cache',
                'No-Cache',
                'max-age=0',
                'max-age=0, public',
                's-maxage=0',
                'must-revalidate',
                'public, max-age=60, must-revalidate',
            ]) {
                expect(isCacheableResponse(200, { 'cache-control': value }), value).to.equal(false);
            }
        });

        it('should refuse field-qualified no-cache/private the same as the bare form (RFC 9111 §5.2.2)', () => {
            for (const value of ['no-cache="Link"', 'private="Set-Cookie"', 'No-Cache="X-Foo"']) {
                expect(isCacheableResponse(200, { 'cache-control': value }), value).to.equal(false);
            }
        });

        it('should refuse a quoted max-age=0 the same as the bare form', () => {
            for (const value of ['max-age="0"', 's-maxage="0"', 'public, max-age="0"']) {
                expect(isCacheableResponse(200, { 'cache-control': value }), value).to.equal(false);
            }
        });

        it('should still cache when max-age is non-zero', () => {
            for (const value of ['max-age=600', 's-maxage=30', 'public, max-age=3600']) {
                expect(isCacheableResponse(200, { 'cache-control': value }), value).to.equal(true);
            }
        });

        it('should return true for cache-friendly Cache-Control values', () => {
            expect(isCacheableResponse(200, { 'cache-control': 'public, max-age=600' })).to.equal(true);
        });
    });

    describe('wrapRequestFragmentWithCache', () => {
        const logger = {
            info: sinon.spy(),
            warn: sinon.spy(),
            error: sinon.spy(),
            debug: sinon.spy(),
        };

        const cacheableAttributes = Object.freeze({
            id: 'app__at__slot',
            appProps: {},
            wrapperConf: null,
            forwardQuerystring: false,
            primary: false,
            timeout: 3000,
            cache: { enabled: true, ttlSeconds: 300 },
        });

        const makeRequest = (overrides: Record<string, unknown> = {}) => ({
            headers: { 'x-request-intl': 'en-US:en-US:USD:USD', 'x-request-host': 'example.org' },
            registryConfig: { apps: {} },
            router: {
                getRoute: () => ({ basePath: '/', reqUrl: '/page' }),
            },
            ...overrides,
        });

        let storage: EvictingCacheStorage;
        let events: Array<{ event: string; appId: string; source?: string }>;
        let clock: sinon.SinonFakeTimers | null = null;

        const makeWrapped = (innerFn: sinon.SinonSpy | ((...args: any[]) => Promise<any>)) =>
            wrapRequestFragmentWithCache(innerFn as any, {
                storage,
                logger: logger as any,
                onCacheEvent: (event, { appId, source }) =>
                    events.push({ event, appId, ...(source ? { source } : {}) }),
            });

        beforeEach(() => {
            storage = new EvictingCacheStorage({ maxSize: 100 });
            events = [];
        });

        afterEach(() => {
            logger.info.resetHistory();
            logger.warn.resetHistory();
            logger.error.resetHistory();
            if (clock) {
                clock.restore();
                clock = null;
            }
        });

        it('should delegate non-cacheable requests untouched and never touch the storage (AC#1)', async () => {
            const response = makeFragmentResponse();
            const inner: sinon.SinonSpy = sinon.spy(async () => response);
            const setItem = sinon.spy(storage, 'setItem');
            const getItem = sinon.spy(storage, 'getItem');
            const wrapped = makeWrapped(inner);

            const attributes = { ...cacheableAttributes, cache: undefined };
            const request = makeRequest();
            const result = await wrapped('http://apps.test/app', attributes, request);

            expect(result).to.equal(response);
            expect(getCacheMarker(attributes)).to.equal(undefined);
            expect(inner.calledOnceWithExactly('http://apps.test/app', attributes, request)).to.equal(true);
            expect(setItem.called).to.equal(false);
            expect(getItem.called).to.equal(false);
            expect(events).to.deep.equal([]);
        });

        it('should bypass the cache entirely for LDE override requests', async () => {
            const response = makeFragmentResponse();
            const inner: sinon.SinonSpy = sinon.spy(async () => response);
            const setItem = sinon.spy(storage, 'setItem');
            const getItem = sinon.spy(storage, 'getItem');
            const wrapped = makeWrapped(inner);

            const attributes = { ...cacheableAttributes };
            const request = makeRequest({ ldeRelated: true });
            const result = await wrapped('http://apps.test/app', attributes, request);

            expect(result).to.equal(response);
            expect(inner.calledOnceWithExactly('http://apps.test/app', attributes, request)).to.equal(true);
            expect(setItem.called).to.equal(false);
            expect(getItem.called).to.equal(false);
        });

        it('should render on miss, serve the rendered body and store it after the stream completes', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () =>
                makeFragmentResponse({ headers: { 'content-type': 'text/html' }, body: 'rendered-once' }),
            );
            const wrapped = makeWrapped(inner);

            const attributes = { ...cacheableAttributes };
            const result = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(inner.callCount).to.equal(1);
            expect(result.statusCode).to.equal(200);
            expect(result.headers['content-type']).to.equal('text/html');
            expect(getCacheMarker(attributes)).to.equal('miss');
            expect(await readBody(result)).to.equal('rendered-once');
            expect(events).to.deep.equal([{ event: 'miss', appId: 'app__at__slot' }]);
        });

        it('should explicitly render cache probes in shared mode (header anonymization contract)', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse());
            const wrapped = makeWrapped(inner);

            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            expect(inner.firstCall.args[1]).to.not.have.property('cacheableRender');
            expect(inner.firstCall.args[3]).to.deep.equal({
                mode: 'shared',
                varyHeaders: pickSharedRenderHeaders({
                    'x-request-intl': 'en-US:en-US:USD:USD',
                    'x-request-host': 'example.org',
                }),
            });
        });

        it('should emit refuse and delegate untouched when caching is enabled but structurally impossible', async () => {
            const response = makeFragmentResponse();
            const inner: sinon.SinonSpy = sinon.spy(async () => response);
            const wrapped = makeWrapped(inner);

            const attributes = {
                ...cacheableAttributes,
                wrapperConf: { appId: 'wrapper__at__slot' },
            };
            const result = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(result).to.equal(response);
            expect(inner.firstCall.args[1]).to.equal(attributes);
            expect(events).to.deep.equal([{ event: 'refuse', appId: 'app__at__slot' }]);
        });

        it('should emit error and rethrow when the cache-path render fails', async () => {
            const failure = new Error('fragment render failed');
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                throw failure;
            });
            const wrapped = makeWrapped(inner);

            let caught: unknown;
            try {
                await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            } catch (error) {
                caught = error;
            }

            expect(caught).to.equal(failure);
            // a plain Error from the render pipeline is a fragment/transport failure, not a bug
            // in the cache module's own code — see cached-fragment-requester.ts's classification
            expect(events).to.deep.equal([{ event: 'error', appId: 'app__at__slot', source: 'fragment' }]);
        });

        it('should tag an unexpected bug in the cache module itself distinctly from a fragment failure', async () => {
            const bug = new TypeError("Cannot read properties of undefined (reading 'foo')");
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                throw bug;
            });
            const wrapped = makeWrapped(inner);

            let caught: unknown;
            try {
                await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            } catch (error) {
                caught = error;
            }

            expect(caught).to.equal(bug);
            expect(events).to.deep.equal([{ event: 'error', appId: 'app__at__slot', source: 'cache-internal' }]);
        });

        it('should rethrow primary-fragment 404 control flow without reporting a cache error', async () => {
            const fragment404 = new errors.Fragment404Response();
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                throw fragment404;
            });
            const wrapped = makeWrapped(inner);

            let caught: unknown;
            try {
                await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            } catch (error) {
                caught = error;
            }

            expect(caught).to.equal(fragment404);
            expect(events).to.deep.equal([]);
        });

        it('should serve a synthetic response from cache on hit without calling the fragment', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () =>
                makeFragmentResponse({ headers: { 'content-type': 'text/html' }, body: 'rendered-once' }),
            );
            const wrapped = makeWrapped(inner);

            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const secondAttributes = { ...cacheableAttributes };
            const second = await wrapped('http://apps.test/app', secondAttributes, makeRequest());

            expect(inner.callCount).to.equal(1);
            expect(second.statusCode).to.equal(200);
            expect(second.headers['content-type']).to.equal('text/html');
            expect(getCacheMarker(secondAttributes)).to.equal('hit');
            expect(await readBody(second)).to.equal('rendered-once');
            expect(events).to.deep.equal([
                { event: 'miss', appId: 'app__at__slot' },
                { event: 'hit', appId: 'app__at__slot' },
            ]);
        });

        it('should vary cache entries by intl and domain', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: 'variant' }));
            const wrapped = makeWrapped(inner);

            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            await wrapped(
                'http://apps.test/app',
                { ...cacheableAttributes },
                makeRequest({ headers: { 'x-request-intl': 'ua-UA:ua-UA:UAH:UAH', 'x-request-host': 'example.org' } }),
            );
            await wrapped(
                'http://apps.test/app',
                { ...cacheableAttributes },
                makeRequest({ headers: { 'x-request-intl': 'en-US:en-US:USD:USD', 'x-request-host': 'other.org' } }),
            );

            expect(inner.callCount).to.equal(3);
        });

        it('should refuse caching when x-request-host is unavailable for shared-render isolation', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: 'shared' }));
            const setItem = sinon.spy(storage, 'setItem');
            const wrapped = makeWrapped(inner);
            const headers = { 'x-request-intl': 'en-US:en-US:USD:USD' };

            const first = await wrapped(
                'http://apps.test/app',
                { ...cacheableAttributes },
                makeRequest({ headers, host: 'first.example' }),
            );
            const second = await wrapped(
                'http://apps.test/app',
                { ...cacheableAttributes },
                makeRequest({ headers, host: 'second.example' }),
            );

            expect(inner.callCount).to.equal(2);
            expect(await readBody(first)).to.equal('shared');
            expect(await readBody(second)).to.equal('shared');
            expect(setItem.called).to.equal(false);
            expect(events).to.deep.equal([
                { event: 'refuse', appId: 'app__at__slot' },
                { event: 'refuse', appId: 'app__at__slot' },
            ]);
        });

        it('should refuse caching on special routes (unbounded path cardinality of reqUrl)', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: 'not-found-page' }));
            const setItem = sinon.spy(storage, 'setItem');
            const wrapped = makeWrapped(inner);

            const specialRouteRequest = (reqUrl: string) =>
                makeRequest({
                    router: { getRoute: () => ({ basePath: '/', reqUrl, specialRole: 404 }) },
                });

            const attributes = { ...cacheableAttributes };
            const first = await wrapped('http://apps.test/app', attributes, specialRouteRequest('/scanned-path-1'));
            const second = await wrapped('http://apps.test/app', attributes, specialRouteRequest('/scanned-path-2'));

            expect(await readBody(first)).to.equal('not-found-page');
            expect(await readBody(second)).to.equal('not-found-page');
            expect(inner.callCount).to.equal(2);
            // delegated untouched: full user headers, nothing stored, marked as refused
            expect(inner.firstCall.args[1]).to.equal(attributes);
            expect(setItem.called).to.equal(false);
            expect(getCacheMarker(attributes)).to.equal('refuse:special-role-route');
            expect(events.map((e) => e.event)).to.deep.equal(['refuse', 'refuse']);
        });

        it('should mark an invalid but cache-enabled config as refused (config rejected before any route lookup)', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: 'invalid-config' }));
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: -1 } };

            const result = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(await readBody(result)).to.equal('invalid-config');
            expect(getCacheMarker(attributes)).to.equal('refuse:ttl-invalid');
            expect(events).to.deep.equal([{ event: 'refuse', appId: 'app__at__slot' }]);
        });

        it('should be blind to the query string: requests differing only in query share one entry', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: 'query-blind' }));
            const wrapped = makeWrapped(inner);

            const withReqUrl = (reqUrl: string) =>
                makeRequest({
                    router: { getRoute: () => ({ basePath: '/', reqUrl }) },
                });

            const first = await wrapped(
                'http://apps.test/app',
                { ...cacheableAttributes },
                withReqUrl('/page?utm_source=facebook&gclid=abc'),
            );
            const second = await wrapped(
                'http://apps.test/app',
                { ...cacheableAttributes },
                withReqUrl('/page?utm_source=google&nonce=xyz'),
            );

            expect(inner.callCount).to.equal(1);
            expect(await readBody(first)).to.equal('query-blind');
            expect(await readBody(second)).to.equal('query-blind');
        });

        it('should store entries under non-reversible digests (no secrets in storage keys or logs)', async () => {
            const setItem = sinon.spy(storage, 'setItem');
            const inner = async () => makeFragmentResponse();
            const wrapped = makeWrapped(inner);

            const attributes = {
                ...cacheableAttributes,
                appProps: { apiToken: 'super-secret-value' },
            };
            await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(setItem.called).to.equal(true);
            for (const call of setItem.getCalls()) {
                const key = call.args[0] as string;
                expect(key).to.match(/^[a-f0-9]{64}$/);
                expect(key).to.not.include('super-secret-value');
            }
        });

        it('should preserve link headers (fragment assets) in cached responses', async () => {
            const link = '<http://apps.test/app.js>; rel="fragment-script"';
            const inner = async () => makeFragmentResponse({ headers: { link } });
            const wrapped = makeWrapped(inner);

            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            expect(second.headers.link).to.equal(link);
        });

        it('should store gzip responses decompressed and serve them without content-encoding', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () =>
                makeFragmentResponse({ body: 'gzipped-body', gzip: true }),
            );
            const wrapped = makeWrapped(inner);

            const first = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            expect(first.headers).to.not.have.property('content-encoding');
            expect(await readBody(first)).to.equal('gzipped-body');
            expect(second.headers).to.not.have.property('content-encoding');
            expect(await readBody(second)).to.equal('gzipped-body');
            expect(inner.callCount).to.equal(1);
        });

        it('should normalize content-encoding before decoding a cacheable response', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () =>
                makeFragmentResponse({ body: 'gzipped-body', gzip: true, contentEncoding: ' GZip ' }),
            );
            const wrapped = makeWrapped(inner);

            const first = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            expect(await readBody(first)).to.equal('gzipped-body');
            expect(await readBody(second)).to.equal('gzipped-body');
            expect(inner.callCount).to.equal(1);
        });

        it('should refuse unsupported content encodings instead of caching their raw bytes', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () =>
                makeFragmentResponse({ body: 'encoded-body', headers: { 'content-encoding': 'br' } }),
            );
            const wrapped = makeWrapped(inner);

            const first = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            expect(await readBody(first)).to.equal('encoded-body');
            expect(await readBody(second)).to.equal('encoded-body');
            expect(inner.callCount).to.equal(3);
        });

        it('should not store anything when the fragment stream errors mid-flight (AC#4)', async () => {
            let shouldFail = true;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                if (shouldFail) {
                    return makeFragmentResponse({ errorMidStream: true });
                }
                return makeFragmentResponse({ body: 'recovered' });
            });
            const wrapped = makeWrapped(inner);

            try {
                await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
                expect.fail('expected mid-stream error to reject');
            } catch (error: any) {
                expect(error.message).to.contain('socket hang up');
            }

            shouldFail = false;
            const result = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            expect(await readBody(result)).to.equal('recovered');
            expect(inner.callCount).to.equal(2);
        });

        it('should propagate fragment request errors untouched and cache nothing (AC#4)', async () => {
            const requestError = new Error('Fragment request failed');
            let shouldFail = true;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                if (shouldFail) {
                    throw requestError;
                }
                return makeFragmentResponse({ body: 'after-error' });
            });
            const wrapped = makeWrapped(inner);

            try {
                await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
                expect.fail('expected rejection');
            } catch (error) {
                expect(error).to.equal(requestError);
            }

            shouldFail = false;
            const result = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            expect(await readBody(result)).to.equal('after-error');
            expect(inner.callCount).to.equal(2);
        });

        it('should not reject cold misses instantly for very large TTLs (timer overflow guard)', async () => {
            const inner = async () => makeFragmentResponse({ body: 'long-lived' });
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 3000000000 } };

            const result = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(await readBody(result)).to.equal('long-lived');
        });

        it('should serve set-cookie responses per request and never share them between callers (AC#3)', async () => {
            let renderCount = 0;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                renderCount += 1;
                return makeFragmentResponse({
                    headers: { 'set-cookie': [`session=user-${renderCount}`] },
                    body: `personalized-${renderCount}`,
                });
            });
            const wrapped = makeWrapped(inner);

            // transition request: one buffered probe (discarded) + one live per-request render
            const first = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            expect(first.headers['set-cookie']).to.deep.equal(['session=user-2']);
            expect(await readBody(first)).to.equal('personalized-2');
            expect(inner.callCount).to.equal(2);

            // tombstone is fresh: subsequent requests render live directly, exactly once each
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            expect(second.headers['set-cookie']).to.deep.equal(['session=user-3']);
            expect(await readBody(second)).to.equal('personalized-3');
            expect(inner.callCount).to.equal(3);

            expect(events.map((e) => e.event)).to.deep.equal(['refuse', 'refuse']);
        });

        it('should give each concurrent caller its own render when the response is not cacheable (AC#3)', async () => {
            let renderCount = 0;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                renderCount += 1;
                return makeFragmentResponse({
                    headers: { 'set-cookie': [`session=user-${renderCount}`] },
                    body: `personalized-${renderCount}`,
                });
            });
            const wrapped = makeWrapped(inner);

            const [first, second] = await Promise.all([
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
            ]);

            expect(first.headers['set-cookie']).to.not.deep.equal(second.headers['set-cookie']);
            // one shared buffered probe + one live render per caller
            expect(inner.callCount).to.equal(3);
        });

        it('should not cache oversized bodies: live render per request, nothing stored (heap bound)', async () => {
            const hugeBody = 'x'.repeat(2 * 1024 * 1024); // 2 MiB > 1 MiB cap
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: hugeBody }));
            const wrapped = makeWrapped(inner);

            // transition request: capped probe (aborted) + live per-request render
            const first = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            expect(await readBody(first)).to.equal(hugeBody);
            expect(inner.callCount).to.equal(2);

            // tombstone is fresh: single live render per request
            const second = await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            expect(await readBody(second)).to.equal(hugeBody);
            expect(inner.callCount).to.equal(3);

            expect(events.map((e) => e.event)).to.deep.equal(['refuse', 'refuse']);
        });

        it('should not cache bodies that decompress beyond the cap (gzip bomb guard)', async () => {
            // tiny raw stream, huge decoded output
            const bomb = zlib.gzipSync(Buffer.alloc(4 * 1024 * 1024, 'a'));
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                const stream = new Readable({ read() {} });
                setImmediate(() => {
                    stream.push(bomb);
                    stream.push(null);
                });
                return Object.assign(stream, { statusCode: 200, headers: { 'content-encoding': 'gzip' } });
            });
            const wrapped = makeWrapped(inner);

            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());
            await wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest());

            // one shared probe + one private render for the transition request, then one private render
            expect(inner.callCount).to.equal(3);
            expect(events.map((e) => e.event)).to.deep.equal(['refuse', 'refuse']);
        });

        it('should serve stale entry immediately after TTL and refresh in background exactly once (SWR)', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            let renderCount = 0;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                renderCount += 1;
                return makeFragmentResponse({ body: `render-${renderCount}` });
            });
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 1 } };

            const first = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(first)).to.equal('render-1');

            clock.tick(2000);

            const stale = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(getCacheMarker(attributes)).to.equal('stale');
            expect(await readBody(stale)).to.equal('render-1');

            await flushAsync();
            expect(inner.callCount).to.equal(2);

            const fresh = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(getCacheMarker(attributes)).to.equal('hit');
            expect(await readBody(fresh)).to.equal('render-2');
            expect(inner.callCount).to.equal(2);
        });

        it('should stop serving a cached entry once the fragment declares itself dynamic (no-store after caching)', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            let dynamic = false;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                if (dynamic) {
                    return makeFragmentResponse({
                        headers: { 'cache-control': 'no-store' },
                        body: `dynamic-${inner.callCount}`,
                    });
                }
                return makeFragmentResponse({ body: 'static' });
            });
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 1 } };

            const first = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(first)).to.equal('static');

            dynamic = true;
            clock.tick(3000);

            // the one allowed stale serve — the background refresh discovers no-store and writes a tombstone
            const stale = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(stale)).to.equal('static');
            await flushAsync();

            // from now on every request renders live (tombstone bypass), never the stale copy
            const second = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(second)).to.equal(`dynamic-${inner.callCount}`);
            const third = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(third)).to.equal(`dynamic-${inner.callCount}`);
            expect(inner.callCount).to.equal(4);

            // even after the tombstone expires, the evicted old entry must never resurrect:
            // the re-probe renders live again, not the ancient 'static' markup
            clock!.tick(3000);
            const reprobe = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(reprobe)).to.equal(`dynamic-${inner.callCount}`);
            await flushAsync();
        });

        it('should not tombstone a stale entry when a background refresh returns a transient non-2xx', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            let renderCount = 0;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                renderCount += 1;
                // the second render (the background refresh) hits a transient origin blip
                if (renderCount === 2) {
                    return makeFragmentResponse({ statusCode: 503, body: 'origin-hiccup' });
                }
                return makeFragmentResponse({ body: `render-${renderCount}` });
            });
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 1 } };

            const first = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(first)).to.equal('render-1');

            clock.tick(2000);

            // triggers the background refresh, which returns 503 (render #2)
            const stale = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(getCacheMarker(attributes)).to.equal('stale');
            expect(await readBody(stale)).to.equal('render-1');

            await flushAsync();
            expect(inner.callCount).to.equal(2);

            // the 503 must not have tombstoned the entry: still stale (not refused), old body intact
            const afterBlip = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(getCacheMarker(attributes)).to.equal('stale');
            expect(await readBody(afterBlip)).to.equal('render-1');

            await flushAsync();
            expect(inner.callCount).to.equal(3);

            // once the origin recovers, the next refresh succeeds and replaces the entry normally
            const recovered = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(getCacheMarker(attributes)).to.equal('hit');
            expect(await readBody(recovered)).to.equal('render-3');
        });

        it('should retry cacheability after the negative entry expires (fragment turned static again)', async () => {
            clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
            let dynamic = true;
            const inner: sinon.SinonSpy = sinon.spy(async () => {
                if (dynamic) {
                    return makeFragmentResponse({ headers: { 'cache-control': 'no-store' }, body: 'dynamic' });
                }
                return makeFragmentResponse({ body: 'static-again' });
            });
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 1 } };

            // writes the tombstone (buffered probe + live per-request render)
            await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(inner.callCount).to.equal(2);

            dynamic = false;
            clock.tick(3000);

            // tombstone expired: cacheable path retried and the entry is stored again
            const retried = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(await readBody(retried)).to.equal('static-again');

            const hit = await wrapped('http://apps.test/app', attributes, makeRequest());
            expect(getCacheMarker(attributes)).to.equal('hit');
            expect(await readBody(hit)).to.equal('static-again');
            expect(inner.callCount).to.equal(3);
        });

        it('should not abort a slow render when ttlSeconds is shorter than the render time', async function () {
            this.timeout(5000);
            const inner = async () => {
                await new Promise((resolve) => setTimeout(resolve, 1100));
                return makeFragmentResponse({ body: 'slow-but-legal' });
            };
            const wrapped = makeWrapped(inner);
            const attributes = { ...cacheableAttributes, cache: { enabled: true, ttlSeconds: 1 } };

            const result = await wrapped('http://apps.test/app', attributes, makeRequest());

            expect(await readBody(result)).to.equal('slow-but-legal');
        });

        it('should deduplicate concurrent misses for the same key into a single render', async () => {
            const inner: sinon.SinonSpy = sinon.spy(async () => makeFragmentResponse({ body: 'deduped' }));
            const wrapped = makeWrapped(inner);

            const [first, second] = await Promise.all([
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
                wrapped('http://apps.test/app', { ...cacheableAttributes }, makeRequest()),
            ]);

            expect(inner.callCount).to.equal(1);
            expect(await readBody(first)).to.equal('deduped');
            expect(await readBody(second)).to.equal('deduped');
        });
    });
});

describe('refusal taxonomy (through the seam)', () => {
    const logger = { info: sinon.spy(), warn: sinon.spy(), error: sinon.spy(), debug: sinon.spy() };

    /**
     * Compile-time proof that every reason in the union has a case below. Adding a seventeenth
     * reason without a test stops compiling here rather than shipping unobserved.
     */
    const COVERED_REASONS: Record<RefusalReason, true> = {
        'cache-disabled': true,
        'ttl-invalid': true,
        'ttl-too-long': true,
        'wrapper-conf': true,
        'forward-querystring': true,
        'special-role-route': true,
        'no-vary-host': true,
        'lde-request': true,
        'status-not-200': true,
        'set-cookie': true,
        'cache-control': true,
        'body-too-large': true,
        'stream-closed-early': true,
        'unsupported-encoding': true,
        'decode-failed': true,
        'capture-budget-exhausted': true,
    };

    const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;
    const baseAttributes = {
        id: 'app__at__slot',
        appProps: {},
        wrapperConf: null as unknown,
        forwardQuerystring: false,
        primary: false,
        timeout: 3000,
        cache: { enabled: true, ttlSeconds: 300 },
    };

    const baseRequest = () => ({
        headers: { 'x-request-intl': 'en-US:en-US:USD:USD', 'x-request-host': 'example.org' },
        registryConfig: { apps: {} },
        router: { getRoute: () => ({ basePath: '/', reqUrl: '/page' }) },
    });

    let events: Array<{ event: string; appId: string; reason?: string }>;

    const makeWrapped = (innerFn: (...args: any[]) => Promise<any>) =>
        wrapRequestFragmentWithCache(innerFn as any, {
            logger: logger as any,
            capacity: { maxConcurrentCaptures: 2, maxBodyBytes: 1024, maxTotalBodyBytes: 8192 },
            onCacheEvent: (event, { appId, reason }) => events.push({ event, appId, reason }),
        });

    beforeEach(() => {
        events = [];
    });

    afterEach(() => {
        logger.info.resetHistory();
        logger.error.resetHistory();
    });

    interface RefusalCase {
        reason: RefusalReason;
        attributes?: Record<string, unknown>;
        request?: Record<string, unknown>;
        response?: MockResponseOptions;
    }

    /** Reasons decided by policy alone: one attribute, header or route differs per case. */
    const policyCases: RefusalCase[] = [
        { reason: 'ttl-invalid', attributes: { cache: { enabled: true, ttlSeconds: 0 } } },
        { reason: 'ttl-too-long', attributes: { cache: { enabled: true, ttlSeconds: MAX_TTL_SECONDS + 1 } } },
        { reason: 'wrapper-conf', attributes: { wrapperConf: { appName: 'wrapper' } } },
        { reason: 'forward-querystring', attributes: { forwardQuerystring: true } },
        {
            reason: 'special-role-route',
            request: { router: { getRoute: () => ({ basePath: '/', reqUrl: '/404', specialRole: 404 }) } },
        },
        { reason: 'no-vary-host', request: { headers: { 'x-request-intl': 'en-US:en-US:USD:USD' } } },
        { reason: 'lde-request', request: { ldeRelated: true } },
        { reason: 'status-not-200', response: { statusCode: 503 } },
        { reason: 'set-cookie', response: { headers: { 'set-cookie': 'sid=1' } } },
        { reason: 'cache-control', response: { headers: { 'cache-control': 'no-store' } } },
        { reason: 'unsupported-encoding', response: { headers: { 'content-encoding': 'br' } } },
        // a gzip label over bytes that are not gzip: decompression, not the label, is what fails
        { reason: 'decode-failed', response: { headers: { 'content-encoding': 'gzip' } } },
        { reason: 'body-too-large', response: { body: 'x'.repeat(4096) } },
    ];

    policyCases.forEach(({ reason, attributes, request, response }) => {
        it(`names '${reason}' on the event, the marker and the log`, async () => {
            const wrapped = makeWrapped(async () => makeFragmentResponse({ body: 'served', ...response }));
            const fragmentAttributes = { ...baseAttributes, ...attributes };

            const result = await wrapped(
                'http://apps.test/app',
                fragmentAttributes as any,
                {
                    ...baseRequest(),
                    ...request,
                } as any,
            );

            // the fragment is always delivered: a refusal downgrades caching, never the response
            expect(await readBody(result)).to.have.length.greaterThan(0);
            expect(events[0]).to.deep.equal({ event: 'refuse', appId: 'app__at__slot', reason });
            expect(getCacheMarker(fragmentAttributes as any)).to.equal(`refuse:${reason}`);
            expect(logger.info.getCall(0).args[0]).to.include({ event: 'refuse', reason });
        });
    });

    it("stays silent for 'cache-disabled': a fragment that never opted in has not been refused", async () => {
        const wrapped = makeWrapped(async () => makeFragmentResponse({ body: 'uncached' }));
        const fragmentAttributes = { ...baseAttributes, cache: undefined };

        const result = await wrapped('http://apps.test/app', fragmentAttributes as any, baseRequest() as any);

        expect(await readBody(result)).to.equal('uncached');
        expect(events).to.deep.equal([]);
        expect(getCacheMarker(fragmentAttributes as any)).to.equal(undefined);
    });

    it('does not resolve the route for a fragment that never opted in', async () => {
        const getRoute = sinon.spy(() => ({ basePath: '/', reqUrl: '/page' }));
        const wrapped = makeWrapped(async () => makeFragmentResponse({ body: 'uncached' }));

        await wrapped(
            'http://apps.test/app',
            { ...baseAttributes, cache: undefined } as any,
            {
                ...baseRequest(),
                router: { getRoute },
            } as any,
        );

        // the cache wraps every fragment, so work it does before the opt-in gate is work every
        // non-caching fragment in the fleet pays for
        expect(getRoute.called, 'the route must not be resolved before the opt-in gate').to.equal(false);
    });

    it('stays silent in LDE too when the fragment never opted in', async () => {
        const wrapped = makeWrapped(async () => makeFragmentResponse({ body: 'lde-uncached' }));
        const fragmentAttributes = { ...baseAttributes, cache: undefined };

        await wrapped(
            'http://apps.test/app',
            fragmentAttributes as any,
            {
                ...baseRequest(),
                ldeRelated: true,
            } as any,
        );

        expect(events).to.deep.equal([]);
    });

    it("names 'stream-closed-early' when the body stops without an end event", async () => {
        const wrapped = makeWrapped(async () => {
            const stream = new Readable({ read() {} });
            setImmediate(() => {
                stream.push('half-a-');
                stream.destroy();
            });
            return Object.assign(stream, { statusCode: 200, headers: {} });
        });
        const fragmentAttributes = { ...baseAttributes };

        await wrapped('http://apps.test/app', fragmentAttributes as any, baseRequest() as any).catch(() => {});

        expect(events[0]).to.deep.include({ event: 'refuse', reason: 'stream-closed-early' });
    });

    it("names 'capture-budget-exhausted' when no capture slot is left", async () => {
        const release: Array<() => void> = [];
        const wrapped = makeWrapped((_url: string, _attrs: any, _req: any, renderOptions?: { mode: string }) => {
            if (renderOptions?.mode === 'shared') {
                return new Promise<any>((resolve) => {
                    release.push(() => resolve(makeFragmentResponse({ body: 'held' })));
                });
            }
            return Promise.resolve(makeFragmentResponse({ body: 'private' }));
        });

        // two slots are injected, so the third distinct key finds the budget spent
        const inFlight = ['a', 'b', 'c'].map((key) =>
            wrapped(
                'http://apps.test/app',
                { ...baseAttributes } as any,
                {
                    ...baseRequest(),
                    router: { getRoute: () => ({ basePath: '/', reqUrl: `/${key}` }) },
                } as any,
            ),
        );
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(events).to.deep.equal([{ event: 'refuse', appId: 'app__at__slot', reason: 'capture-budget-exhausted' }]);

        release.forEach((fn) => fn());
        await Promise.all(inFlight);
    });

    it('replays the original reason from the tombstone rather than a second, contextless refusal', async () => {
        let renders = 0;
        const wrapped = makeWrapped(async () => {
            renders += 1;
            return makeFragmentResponse({ body: 'private-page', headers: { 'set-cookie': 'sid=1' } });
        });

        await wrapped('http://apps.test/app', { ...baseAttributes } as any, baseRequest() as any);
        const secondAttributes = { ...baseAttributes };
        await wrapped('http://apps.test/app', secondAttributes as any, baseRequest() as any);

        // the second request never reaches the origin's cacheability rules again — it reads the
        // tombstone — yet still reports why the entry was refused in the first place
        expect(renders).to.be.greaterThan(1);
        expect(events.map((e) => e.reason)).to.deep.equal(['set-cookie', 'set-cookie']);
        expect(getCacheMarker(secondAttributes as any)).to.equal('refuse:set-cookie');
    });

    it('covers every reason in the union', () => {
        // Record<RefusalReason, true> already forces a new reason to be listed; this proves the
        // listing matches the shipped set exactly, with nothing stale left behind either
        expect(Object.keys(COVERED_REASONS).sort()).to.deep.equal([...REFUSAL_REASONS].sort());
    });
});
