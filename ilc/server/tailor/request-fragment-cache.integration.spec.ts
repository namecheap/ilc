import chai from 'chai';
import nock from 'nock';
import zlib from 'zlib';
import supertest from 'supertest';
import * as helpers from '../../tests/helpers';
// server/app.js is a large untyped legacy composition root (out of this PR's conversion scope);
// its factory shape is asserted here rather than fought field-by-field.
const createApp = require('../app') as (...args: any[]) => Promise<any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Integration coverage for SSR fragment caching (NPF-5188): real ILC app + nock'ed fragments.
 * A fresh app instance is created per test — the fragment cache lives inside the tailor factory,
 * so reusing one app would leak cached entries between tests.
 */
type MockFragmentState = {
    hits: { primary: number; regular: number };
    regularHeaders: Record<string, string>[];
    regularUris: string[];
};

describe('request-fragment-cache integration', () => {
    let app: any;
    let server: ReturnType<typeof supertest>;

    afterEach(async () => {
        if (app) {
            await app.close();
            app = null;
        }
        nock.cleanAll();
    });

    async function bootApp({ cache = { enabled: true, ttlSeconds: 300 } } = {}) {
        const registryOverrides = {
            // the default mock template renders only the "primary" slot; the cache tests
            // need the cache-enabled "regular" fragment on the page next to a non-cached one
            getTemplate: () => ({
                data: {
                    content:
                        '<!DOCTYPE html><html lang="en-US"><head></head><body>\n' +
                        '<div id="primary"><slot name="primary"></slot></div>\n' +
                        '<div id="regular"><slot name="regular"></slot></div>\n' +
                        '</body></html>',
                },
            }),
            apps: {
                '@portal/regular': {
                    ssr: cache ? { cache } : {},
                },
            },
        };

        // the default i18n detection mock ignores the URL locale prefix — parse it for real,
        // otherwise localized requests like /ua/all get redirected back to the default locale
        const pluginManager = {
            ...helpers.getPluginManagerMock(),
            getI18nParamsDetectionPlugin: () => ({
                type: 'i18nParamsDetection',
                detectI18nConfig: (req: { url: string }, intl: any, i18nConfig: Record<string, unknown>) => {
                    const { locale } = intl.parseUrl(req.url);
                    return { ...i18nConfig, locale };
                },
            }),
        };

        app = await createApp(helpers.getRegistryMock(registryOverrides), pluginManager);
        await app.ready();
        app.server.listen(0);
        server = supertest(app.server);
    }

    function mockFragments({ regular }: { regular?: (state: MockFragmentState) => nock.ReplyFnResult } = {}) {
        const state: MockFragmentState = {
            hits: { primary: 0, regular: 0 },
            regularHeaders: [],
            regularUris: [],
        };

        nock('http://apps.test')
            .persist()
            .get(/.?/)
            .reply(function (uri): nock.ReplyFnResult {
                if (uri.startsWith('/primary')) {
                    state.hits.primary += 1;
                    return [200, `<div>primary-content-${state.hits.primary}</div>`];
                }

                state.hits.regular += 1;
                state.regularHeaders.push(this.req.headers);
                state.regularUris.push(uri);

                if (regular) {
                    return regular(state);
                }

                return [200, `<div>regular-content-${state.hits.regular}</div>`];
            });

        return state;
    }

    it('should render a cache-enabled fragment once for N page requests and mark HIT (Todo#3, AC#5)', async () => {
        await bootApp();
        const state = mockFragments();

        const first = await server.get('/all').expect(200);
        chai.expect(first.text).to.include('regular-content-1');
        chai.expect(first.text).to.include('<!-- ilc:fragment-cache MISS -->');

        const second = await server.get('/all').expect(200);
        const third = await server.get('/all').expect(200);

        chai.expect(state.hits.regular).to.equal(1);
        chai.expect(second.text).to.include('regular-content-1');
        chai.expect(second.text).to.include('<!-- ilc:fragment-cache HIT -->');
        chai.expect(third.text).to.include('regular-content-1');
    });

    it('should keep rendering non-enabled fragments on every request on the same page (AC#1)', async () => {
        await bootApp();
        const state = mockFragments();

        await server.get('/all').expect(200);
        await server.get('/all').expect(200);
        await server.get('/all').expect(200);

        chai.expect(state.hits.primary).to.equal(3);
        chai.expect(state.hits.regular).to.equal(1);
    });

    it('should serve the same cached body to different users and never forward their identity (AC#3)', async () => {
        await bootApp();
        const state = mockFragments();

        const first = await server
            .get('/all')
            .set('Cookie', 'session=user-a')
            .set('Authorization', 'Bearer user-a-token')
            .set('X-Forwarded-For', '203.0.113.7')
            .expect(200);
        const second = await server
            .get('/all')
            .set('Cookie', 'session=user-b')
            .set('Authorization', 'Bearer user-b-token')
            .expect(200);

        chai.expect(state.hits.regular).to.equal(1);
        chai.expect(first.text).to.include('regular-content-1');
        chai.expect(second.text).to.include('regular-content-1');

        chai.expect(state.regularHeaders[0]).to.not.have.property('cookie');
        chai.expect(state.regularHeaders[0]).to.not.have.property('authorization');
        chai.expect(state.regularHeaders[0]).to.not.have.property('x-forwarded-for');
        chai.expect(state.regularHeaders[0]).to.have.property('x-request-host');
    });

    it('should render separately per locale and never mix localized content (AC#3)', async () => {
        await bootApp();
        const state = mockFragments();

        const defaultLocale = await server.get('/all').expect(200);
        const uaLocale = await server.get('/ua/all').expect(200);
        const uaLocaleAgain = await server.get('/ua/all').expect(200);

        chai.expect(state.hits.regular).to.equal(2);
        chai.expect(defaultLocale.text).to.include('regular-content-1');
        chai.expect(uaLocale.text).to.include('regular-content-2');
        chai.expect(uaLocaleAgain.text).to.include('regular-content-2');
    });

    it('should render separately per domain (AC#3)', async () => {
        await bootApp();
        const state = mockFragments();

        await server.get('/all').set('Host', 'foo.example.org').expect(200);
        await server.get('/all').set('Host', 'bar.example.org').expect(200);
        await server.get('/all').set('Host', 'foo.example.org').expect(200);

        chai.expect(state.hits.regular).to.equal(2);
    });

    it('should not cache error responses and keep the error path unchanged (AC#4)', async () => {
        await bootApp();
        const state = mockFragments({
            regular: () => [500, 'fragment exploded'],
        });

        const first = await server.get('/all');
        const second = await server.get('/all');

        chai.expect(state.hits.regular).to.equal(2);
        chai.expect(first.text).to.not.include('ilc:fragment-cache HIT');
        chai.expect(second.text).to.not.include('ilc:fragment-cache HIT');
    });

    it('should serve set-cookie responses to the current user but never cache them (AC#3/AC#4)', async () => {
        await bootApp();
        const state = mockFragments({
            regular: (s) => [200, `<div>personalized-${s.hits.regular}</div>`, { 'Set-Cookie': 'flavor=choco' }],
        });

        // transition request: buffered probe (discarded) + live per-request render
        const first = await server.get('/all').expect(200);
        // tombstone is fresh: exactly one live render per request
        const second = await server.get('/all').expect(200);

        chai.expect(state.hits.regular).to.equal(3);
        chai.expect(first.text).to.include('personalized-2');
        chai.expect(second.text).to.include('personalized-3');
        chai.expect(second.text).to.not.include('ilc:fragment-cache HIT');
    });

    it('should respect Cache-Control: no-store from the fragment even when caching is enabled (AC#2)', async () => {
        await bootApp();
        const state = mockFragments({
            regular: (s) => [200, `<div>priced-${s.hits.regular}</div>`, { 'Cache-Control': 'no-store' }],
        });

        const first = await server.get('/all').expect(200);
        const second = await server.get('/all').expect(200);

        chai.expect(state.hits.regular).to.equal(3);
        chai.expect(first.text).to.include('priced-2');
        chai.expect(second.text).to.include('priced-3');
        chai.expect(second.text).to.not.include('ilc:fragment-cache HIT');
    });

    it('should be blind to query strings: UTM traffic shares one entry and the fragment never sees the query', async () => {
        await bootApp();
        const state = mockFragments();

        const first = await server.get('/all?utm_source=facebook&gclid=abc123').expect(200);
        const second = await server.get('/all?utm_source=google&nonce=xyz').expect(200);

        chai.expect(state.hits.regular).to.equal(1);
        chai.expect(first.text).to.include('regular-content-1');
        chai.expect(second.text).to.include('regular-content-1');
        chai.expect(second.text).to.include('<!-- ilc:fragment-cache HIT -->');

        // the render input contract: query is neither in the key nor visible to the fragment
        const routerPropsParam = new URL('http://apps.test' + state.regularUris[0]).searchParams.get('routerProps');
        const routerProps = JSON.parse(Buffer.from(routerPropsParam!, 'base64').toString('utf8'));
        chai.expect(routerProps.reqUrl).to.not.include('utm_source');
        chai.expect(routerProps.reqUrl).to.not.include('?');
    });

    it('should serve stale after TTL and refresh in the background (SWR)', async function () {
        this.timeout(10000);

        await bootApp({ cache: { enabled: true, ttlSeconds: 1 } });
        const state = mockFragments();

        const first = await server.get('/all').expect(200);
        chai.expect(first.text).to.include('regular-content-1');

        // cachedAt/now are floored to whole seconds, so ttl + 1s + margin guarantees staleness
        await sleep(2200);

        const stale = await server.get('/all').expect(200);
        chai.expect(stale.text).to.include('regular-content-1');
        chai.expect(stale.text).to.include('<!-- ilc:fragment-cache STALE -->');

        await sleep(100);
        chai.expect(state.hits.regular).to.equal(2);

        const fresh = await server.get('/all').expect(200);
        chai.expect(fresh.text).to.include('regular-content-2');
        chai.expect(fresh.text).to.include('<!-- ilc:fragment-cache HIT -->');
        chai.expect(state.hits.regular).to.equal(2);
    });

    it('should cache gzip fragment responses and replay identical markup', async () => {
        await bootApp();
        const state = mockFragments({
            regular: () => [200, zlib.gzipSync('<div>gzipped-regular-content</div>'), { 'Content-Encoding': 'gzip' }],
        });

        const first = await server.get('/all').expect(200);
        const second = await server.get('/all').expect(200);

        chai.expect(state.hits.regular).to.equal(1);
        chai.expect(first.text).to.include('gzipped-regular-content');
        chai.expect(second.text).to.include('gzipped-regular-content');
        chai.expect(second.text).to.include('<!-- ilc:fragment-cache HIT -->');
    });
});
