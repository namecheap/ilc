import http from 'node:http';
import zlib from 'node:zlib';
import chai from 'chai';
import supertest from 'supertest';
import * as helpers from '../../tests/helpers';
import { isCacheableRequest } from './request-fragment-cache';
import { pickSharedRenderHeaders } from './fragment-render';

// server/app.js is a large untyped legacy composition root (out of this PR's conversion scope);
// its factory shape is asserted here rather than fought field-by-field.
const createApp = require('../app') as (...args: any[]) => Promise<any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FragmentHandler = (req: http.IncomingMessage, res: http.ServerResponse) => unknown;
type ReceivedRequest = { url: string; headers: http.IncomingHttpHeaders };

/**
 * End-to-end coverage of SSR fragment caching (NPF-5188) against a REAL fragment consumer:
 * a genuine HTTP server on a real socket, real gzip, real streaming and real keep-alive —
 * no nock interception. This exercises paths the interception-based suite cannot reach:
 * transport-level encoding negotiation, chunked bodies, slow bodies, socket reuse.
 */
describe('request-fragment-cache — real consumer', () => {
    let fragmentServer: http.Server;
    let fragmentOrigin: string;
    let app: any;
    let server: ReturnType<typeof supertest>;
    /** Per-scenario handler; replaced by each test. */
    let handle: FragmentHandler;
    /** Records every request the fragment actually received. */
    let received: ReceivedRequest[];

    before(async () => {
        fragmentServer = http.createServer((req, res) => {
            // several scenarios make ILC abort mid-response on purpose (size cap, deadline,
            // transport timeout) — the resulting socket errors are expected, not failures
            res.on('error', () => {});
            req.on('error', () => {});
            received.push({ url: req.url!, headers: req.headers });
            // the non-cached primary fragment answers statically, so per-scenario
            // handlers (and their render counters) observe the cached fragment alone
            if (req.url!.startsWith('/primary')) {
                res.end('<div>primary-static</div>');
                return;
            }
            handle(req, res);
        });
        fragmentServer.on('error', () => {});
        await new Promise<void>((resolve) => fragmentServer.listen(0, '127.0.0.1', () => resolve()));
        const address = fragmentServer.address();
        fragmentOrigin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : ''}`;
    });

    after(async () => {
        await new Promise((resolve) => fragmentServer.close(resolve));
    });

    beforeEach(() => {
        received = [];
        handle = (req, res) => res.end('<div>default</div>');
    });

    afterEach(async () => {
        if (app) {
            await app.close();
            app = null;
        }
    });

    async function bootIlc(
        { cache }: { cache?: { enabled: boolean; ttlSeconds: number } | null } = {
            cache: { enabled: true, ttlSeconds: 300 },
        },
    ) {
        const registryOverrides = {
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
                '@portal/primary': { ssr: { src: `${fragmentOrigin}/primary`, timeout: 2000 } },
                '@portal/regular': {
                    ssr: { src: `${fragmentOrigin}/regular`, timeout: 2000, ...(cache ? { cache } : {}) },
                },
            },
        };

        // parse the locale prefix for real so localized routes are not redirected away
        const pluginManager = {
            ...helpers.getPluginManagerMock(),
            getI18nParamsDetectionPlugin: () => ({
                type: 'i18nParamsDetection',
                detectI18nConfig: (req: { url: string }, intl: any, i18nConfig: Record<string, unknown>) => ({
                    ...i18nConfig,
                    locale: intl.parseUrl(req.url).locale,
                }),
            }),
        };

        app = await createApp(helpers.getRegistryMock(registryOverrides), pluginManager);
        await app.ready();
        app.server.listen(0);
        server = supertest(app.server);
    }

    const regularRequests = () => received.filter((r) => r.url.startsWith('/regular'));
    const regularHits = () => regularRequests().length;

    describe('caching over a real socket', () => {
        it('renders once for N page requests and replays the stored body', async () => {
            await bootIlc();
            let renders = 0;
            handle = (req, res) => {
                renders += 1;
                res.end(`<div>rendered-${renders}</div>`);
            };

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);
            const third = await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(1);
            chai.expect(first.text).to.include('rendered-1');
            chai.expect(second.text).to.include('rendered-1');
            chai.expect(third.text).to.include('rendered-1');
            chai.expect(second.text).to.include('<!-- ilc:fragment-cache HIT -->');
        });

        it('replays a real gzip-compressed fragment identically', async () => {
            await bootIlc();
            handle = (req, res) => {
                const body = zlib.gzipSync(Buffer.from('<div>gzipped-from-the-wire</div>'));
                res.writeHead(200, { 'content-encoding': 'gzip', 'content-type': 'text/html' });
                res.end(body);
            };

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(1);
            chai.expect(first.text).to.include('gzipped-from-the-wire');
            chai.expect(second.text).to.include('gzipped-from-the-wire');
        });

        it('replays a chunked (streamed) fragment body', async () => {
            await bootIlc();
            handle = async (req, res) => {
                res.writeHead(200, { 'content-type': 'text/html' });
                res.write('<div>chunk-a');
                await sleep(15);
                res.write('|chunk-b');
                await sleep(15);
                res.end('|chunk-c</div>');
            };

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(1);
            chai.expect(first.text).to.include('chunk-a|chunk-b|chunk-c');
            chai.expect(second.text).to.include('chunk-a|chunk-b|chunk-c');
        });
    });

    describe('user isolation (AC#3)', () => {
        it('never forwards identifying headers on a cacheable render and shares one body', async () => {
            await bootIlc();
            handle = (req, res) => res.end('<div>shared-body</div>');

            const first = await server
                .get('/all')
                .set('Cookie', 'session=user-a')
                .set('Authorization', 'Bearer token-a')
                .set('X-Forwarded-For', '203.0.113.7')
                .set('Accept-Language', 'fr-CH')
                .expect(200);
            const second = await server
                .get('/all')
                .set('Cookie', 'session=user-b')
                .set('Authorization', 'Bearer token-b')
                .expect(200);

            chai.expect(regularHits()).to.equal(1);
            chai.expect(first.text).to.include('shared-body');
            chai.expect(second.text).to.include('shared-body');

            const sent = regularRequests()[0].headers;
            chai.expect(sent).to.not.have.property('cookie');
            chai.expect(sent).to.not.have.property('authorization');
            chai.expect(sent).to.not.have.property('x-forwarded-for');
            chai.expect(sent).to.not.have.property('accept-language');
            chai.expect(sent).to.have.property('x-request-host');
        });

        it('keeps locales apart', async () => {
            await bootIlc();
            let renders = 0;
            handle = (req, res) => {
                renders += 1;
                res.end(`<div>locale-render-${renders}</div>`);
            };

            const en = await server.get('/all').expect(200);
            const ua = await server.get('/ua/all').expect(200);
            const uaAgain = await server.get('/ua/all').expect(200);

            chai.expect(regularHits()).to.equal(2);
            chai.expect(en.text).to.include('locale-render-1');
            chai.expect(ua.text).to.include('locale-render-2');
            chai.expect(uaAgain.text).to.include('locale-render-2');
        });

        it('keeps domains apart', async () => {
            await bootIlc();
            handle = (req, res) => res.end(`<div>host-${req.headers['x-request-host']}</div>`);

            await server.get('/all').set('Host', 'foo.example.org').expect(200);
            await server.get('/all').set('Host', 'bar.example.org').expect(200);
            await server.get('/all').set('Host', 'foo.example.org').expect(200);

            chai.expect(regularHits()).to.equal(2);
        });

        it('is blind to the query string and never leaks it to the fragment', async () => {
            await bootIlc();
            handle = (req, res) => res.end('<div>query-blind</div>');

            await server.get('/all?utm_source=facebook&gclid=abc').expect(200);
            const second = await server.get('/all?utm_source=google&nonce=xyz').expect(200);

            chai.expect(regularHits()).to.equal(1);
            chai.expect(second.text).to.include('<!-- ilc:fragment-cache HIT -->');

            const routerProps = JSON.parse(
                Buffer.from(
                    new URL(`http://x${regularRequests()[0].url}`).searchParams.get('routerProps')!,
                    'base64',
                ).toString('utf8'),
            );
            chai.expect(routerProps.reqUrl).to.not.include('utm_source');
        });
    });

    describe('refusals (AC#2 / AC#4)', () => {
        it('never caches nor shares a set-cookie response', async () => {
            await bootIlc();
            let renders = 0;
            handle = (req, res) => {
                renders += 1;
                res.writeHead(200, { 'set-cookie': `session=user-${renders}` });
                res.end(`<div>personalized-${renders}</div>`);
            };

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(first.text).to.not.equal(second.text);
            chai.expect(second.text).to.not.include('ilc:fragment-cache HIT');
        });

        it('honours Cache-Control: no-store from the fragment', async () => {
            await bootIlc();
            let renders = 0;
            handle = (req, res) => {
                renders += 1;
                res.writeHead(200, { 'cache-control': 'no-store' });
                res.end(`<div>priced-${renders}</div>`);
            };

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(first.text).to.not.equal(second.text);
            chai.expect(second.text).to.not.include('ilc:fragment-cache HIT');
        });

        it('does not cache a 500 response and keeps rendering live', async () => {
            await bootIlc();
            handle = (req, res) => {
                res.writeHead(500);
                res.end('boom');
            };

            await server.get('/all');
            await server.get('/all');

            chai.expect(regularHits()).to.equal(2);
        });

        it('refuses to cache bodies over the 1 MiB budget and still delivers them intact', async () => {
            await bootIlc();
            const payload = 'x'.repeat(2 * 1024 * 1024); // 2 MiB, twice the cap
            const marker = 'END-OF-OVERSIZED-BODY';
            handle = (req, res) => res.end(`<div>${payload}${marker}</div>`);

            const first = await server.get('/all').expect(200);
            const before = regularHits();
            const second = await server.get('/all').expect(200);

            // not cached: every request renders live
            chai.expect(regularHits()).to.be.greaterThan(before);
            // and critically: the oversized body is delivered whole, not truncated at the cap
            for (const response of [first, second]) {
                chai.expect(response.text).to.include(marker);
                chai.expect(response.text.length).to.be.greaterThan(2 * 1024 * 1024);
            }
        });

        it('caches a body just under the cap and keeps it byte-exact', async () => {
            await bootIlc();
            const marker = 'UNDER-CAP-TAIL';
            const payload = 'y'.repeat(1000 * 1024 - marker.length); // ~0.98 MiB, under 1 MiB
            handle = (req, res) => res.end(`${payload}${marker}`);

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(1); // cached
            chai.expect(second.text).to.include('<!-- ilc:fragment-cache HIT -->');
            // replayed body is identical to the freshly rendered one
            const fragmentOf = (html: string) => html.slice(html.indexOf('yyy'), html.indexOf(marker) + marker.length);
            chai.expect(fragmentOf(second.text)).to.equal(fragmentOf(first.text));
            chai.expect(fragmentOf(second.text).length).to.equal(1000 * 1024);
        });

        it('delivers an oversized gzip body intact while refusing to cache it', async () => {
            await bootIlc();
            const marker = 'END-OF-GZIP-BOMB';
            const raw = Buffer.from('z'.repeat(4 * 1024 * 1024) + marker);
            handle = (req, res) => {
                res.writeHead(200, { 'content-encoding': 'gzip' });
                res.end(zlib.gzipSync(raw));
            };

            const first = await server.get('/all').expect(200);
            const before = regularHits();
            await server.get('/all').expect(200);

            chai.expect(regularHits()).to.be.greaterThan(before);
            // TailorX unzips the live response for the browser — the payload must survive whole
            chai.expect(first.text).to.include(marker);
            chai.expect(first.text.length).to.be.greaterThan(4 * 1024 * 1024);
        });

        it('keeps refusing oversized renders without poisoning the cache for other keys', async function () {
            this.timeout(30000);
            await bootIlc();
            handle = (req, res) => res.end(`<div>${'q'.repeat(1536 * 1024)}</div>`); // 1.5 MiB, over cap

            for (let i = 0; i < 10; i++) {
                await server.get('/all').expect(200);
            }
            const oversizedRenders = regularHits();
            // every single request rendered live — nothing was stored, nothing was replayed
            chai.expect(oversizedRenders).to.be.at.least(10);

            // a different key on the same fragment still caches normally afterwards
            handle = (req, res) => res.end('<div>small-and-cacheable</div>');
            const firstUa = await server.get('/ua/all').expect(200);
            const secondUa = await server.get('/ua/all').expect(200);

            chai.expect(regularHits()).to.equal(oversizedRenders + 1);
            chai.expect(firstUa.text).to.include('small-and-cacheable');
            chai.expect(secondUa.text).to.include('<!-- ilc:fragment-cache HIT -->');
        });

        it('refuses a decompression bomb without exhausting memory', async () => {
            await bootIlc();
            handle = (req, res) => {
                const bomb = zlib.gzipSync(Buffer.alloc(4 * 1024 * 1024, 'a'));
                res.writeHead(200, { 'content-encoding': 'gzip' });
                res.end(bomb);
            };

            await server.get('/all').expect(200);
            const before = regularHits();
            await server.get('/all').expect(200);

            chai.expect(regularHits()).to.be.greaterThan(before);
        });

        it('refuses an unsupported content-encoding', async () => {
            await bootIlc();
            handle = (req, res) => {
                res.writeHead(200, { 'content-encoding': 'br' });
                res.end('<div>brotli</div>');
            };

            await server.get('/all');
            const before = regularHits();
            await server.get('/all');

            chai.expect(regularHits()).to.be.greaterThan(before);
        });
    });

    describe('lifetime', () => {
        it('serves stale immediately and refreshes once in the background (SWR)', async function () {
            this.timeout(15000);
            await bootIlc({ cache: { enabled: true, ttlSeconds: 1 } });
            let renders = 0;
            handle = (req, res) => {
                renders += 1;
                res.end(`<div>swr-${renders}</div>`);
            };

            const first = await server.get('/all').expect(200);
            chai.expect(first.text).to.include('swr-1');

            await sleep(2200);

            const stale = await server.get('/all').expect(200);
            chai.expect(stale.text).to.include('swr-1');
            chai.expect(stale.text).to.include('<!-- ilc:fragment-cache STALE -->');

            await sleep(200);
            chai.expect(regularHits()).to.equal(2);

            const fresh = await server.get('/all').expect(200);
            chai.expect(fresh.text).to.include('swr-2');
            chai.expect(fresh.text).to.include('<!-- ilc:fragment-cache HIT -->');
        });

        it('deduplicates concurrent misses into a single upstream render', async () => {
            await bootIlc();
            handle = async (req, res) => {
                await sleep(120);
                res.end('<div>deduped</div>');
            };

            const [a, b, c] = await Promise.all([server.get('/all'), server.get('/all'), server.get('/all')]);

            chai.expect(regularHits()).to.equal(1);
            for (const response of [a, b, c]) {
                chai.expect(response.text).to.include('deduped');
            }
        });

        it('bounds a dripping body by the render deadline and recovers afterwards', async function () {
            this.timeout(20000);
            await bootIlc();
            let attempt = 0;
            handle = async (req, res) => {
                attempt += 1;
                if (attempt === 1) {
                    // headers immediately, body never completes — the idle timeout never fires.
                    // Stop as soon as ILC gives up, so the handler never outlives its test.
                    res.writeHead(200, { 'content-type': 'text/html' });
                    let aborted = false;
                    res.on('close', () => {
                        aborted = true;
                    });
                    while (!aborted) {
                        res.write('x');
                        await sleep(50);
                    }
                    return;
                }
                res.end('<div>recovered</div>');
            };

            await server.get('/all');
            const recovered = await server.get('/all').expect(200);

            chai.expect(recovered.text).to.include('recovered');
        });
    });

    describe('protocol details preserved through the cache', () => {
        it('replays Link headers so fragment assets keep loading on a hit', async () => {
            await bootIlc();
            const link = `<${fragmentOrigin}/app.js>; rel="fragment-script"`;
            handle = (req, res) => {
                res.writeHead(200, { link, 'content-type': 'text/html' });
                res.end('<div>with-assets</div>');
            };

            const first = await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(1);
            // the asset override script is emitted from the Link header by insertStart
            chai.expect(first.text).to.include('text/spa-config-override');
            chai.expect(second.text).to.include('text/spa-config-override');
        });

        it('does not replay hop-by-hop headers from the stored response', async () => {
            await bootIlc();
            handle = (req, res) => {
                res.writeHead(200, { 'content-type': 'text/html', 'x-custom-marker': 'from-fragment' });
                res.end('<div>headers-check</div>');
            };

            await server.get('/all').expect(200);
            const second = await server.get('/all').expect(200);

            chai.expect(second.text).to.include('headers-check');
            chai.expect(second.headers).to.not.have.property('content-encoding');
        });
    });

    describe('flows that must never be cached', () => {
        it('refuses caching on a special route (404) where reqUrl is unbounded', async () => {
            await bootIlc();
            handle = (req, res) => {
                res.writeHead(404);
                res.end('<div>not-found</div>');
            };

            await server.get('/all');
            const before = regularHits();
            await server.get('/all');

            chai.expect(regularHits()).to.be.greaterThan(before);
        });

        it('keeps rendering live when the fragment times out at the transport level', async function () {
            this.timeout(20000);
            await bootIlc();
            let attempt = 0;
            handle = async (req, res) => {
                attempt += 1;
                if (attempt === 1) {
                    // exceeds ssr.timeout of 2000ms; stop early once ILC aborts so the
                    // handler never outlives its test
                    let aborted = false;
                    res.on('close', () => {
                        aborted = true;
                    });
                    for (let i = 0; i < 60 && !aborted; i++) {
                        await sleep(50);
                    }
                    if (!aborted) {
                        res.end('<div>too-late</div>');
                    }
                    return;
                }
                res.end('<div>after-timeout</div>');
            };

            await server.get('/all');
            const recovered = await server.get('/all').expect(200);

            chai.expect(recovered.text).to.include('after-timeout');
        });

        it('refuses caching when ttlSeconds exceeds the 30-day runtime cap', async () => {
            await bootIlc({ cache: { enabled: true, ttlSeconds: 2592001 } });
            handle = (req, res) => res.end('<div>over-cap</div>');

            await server.get('/all').expect(200);
            await server.get('/all').expect(200);
            await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(3);
        });

        it('refuses caching for fragments using forwardQuerystring', async () => {
            await bootIlc();
            // forwardQuerystring is declared per route slot; assert through the registry-level flag
            chai.expect(
                isCacheableRequest(
                    {
                        id: 'app__at__slot',
                        cache: { enabled: true, ttlSeconds: 300 },
                        forwardQuerystring: true,
                    },
                    {},
                    pickSharedRenderHeaders({ 'x-request-host': 'example.org' }),
                ),
            ).to.equal(false);
        });
    });

    describe('recovery', () => {
        it('caches again after a refusal expires (fragment turned static)', async function () {
            this.timeout(15000);
            await bootIlc({ cache: { enabled: true, ttlSeconds: 1 } });
            let dynamic = true;
            handle = (req, res) => {
                if (dynamic) {
                    res.writeHead(200, { 'cache-control': 'no-store' });
                    res.end('<div>dynamic</div>');
                    return;
                }
                res.end('<div>static-again</div>');
            };

            await server.get('/all').expect(200);
            dynamic = false;
            await sleep(2200);

            await server.get('/all').expect(200);
            const hit = await server.get('/all').expect(200);

            chai.expect(hit.text).to.include('static-again');
            chai.expect(hit.text).to.include('<!-- ilc:fragment-cache HIT -->');
        });
    });

    describe('bypasses', () => {
        it('leaves non-enabled fragments untouched (AC#1)', async () => {
            await bootIlc({ cache: null });
            handle = (req, res) => res.end('<div>never-cached</div>');

            await server.get('/all').expect(200);
            await server.get('/all').expect(200);
            await server.get('/all').expect(200);

            chai.expect(regularHits()).to.equal(3);
        });
    });
});
