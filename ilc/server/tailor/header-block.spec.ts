import net from 'node:net';
import http from 'node:http';
import Agent from 'agentkeepalive';
import { expect } from 'chai';

import {
    findLargestHeader,
    headFor,
    MAX_LOGGED_HEADER_NAME,
    measureHeadTotal,
    serializeOutgoingRequest,
} from './header-block';

/** Reads the block node built, without asking this module to build it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeHead = (request: http.ClientRequest): string | null => (request as any)._header;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const materialize = (request: http.ClientRequest): string => ((request as any)._implicitHeader(), nodeHead(request)!);

describe('measureHeadTotal', () => {
    it('counts the request line, every header line and the terminator', () => {
        const head = 'GET /x HTTP/1.1\r\nHost: h\r\nConnection: keep-alive\r\n\r\n';

        expect(measureHeadTotal(head)).to.equal(head.length);
    });

    it('counts bytes as latin1, the way node writes them', () => {
        const multiByte = 'GET /x HTTP/1.1\r\nx-u: ééééé\r\n\r\n';

        expect(measureHeadTotal(multiByte)).to.equal(Buffer.byteLength(multiByte, 'latin1'));
    });
});

describe('findLargestHeader', () => {
    it('reports the largest header line and ignores the request line', () => {
        const head = `GET /${'p'.repeat(200)} HTTP/1.1\r\nx-a: ${'v'.repeat(40)}\r\nx-b: short\r\n\r\n`;

        expect(findLargestHeader(head)).to.deep.equal({ name: 'x-a', bytes: 47 });
    });

    it('bounds the reported name so one request cannot write kilobytes of logs', () => {
        const name = `x-${'n'.repeat(5000)}`;
        const largest = findLargestHeader(`GET /x HTTP/1.1\r\n${name}: v\r\n\r\n`);

        expect(largest.name.length).to.be.at.most(MAX_LOGGED_HEADER_NAME + 1);
        expect(largest.bytes).to.equal(name.length + 5);
    });

    it('counts the final line when the head is not CRLF-terminated', () => {
        // Regression: the index scanner treated a missing CRLF as end-of-block and dropped the
        // last header, reporting "A" instead of "B". Both producers terminate their heads, but
        // this function is exported and can be handed any string.
        expect(findLargestHeader('GET /x HTTP/1.1\r\nA: 1\r\nB: 22222')).to.deep.equal({ name: 'B', bytes: 10 });
    });

    it('returns an empty result for a head with no header lines', () => {
        expect(findLargestHeader('GET /x HTTP/1.1\r\n\r\n')).to.deep.equal({ name: '', bytes: 0 });
    });
});

describe('serializeOutgoingRequest — the oracle', () => {
    // The reconstruction reproduces node's _storeHeader by hand, so nothing about it is
    // guaranteed. This suite is what makes it trustworthy: every shape is built both ways and
    // the strings must agree. An earlier model on this branch had no oracle, and its tests
    // asserted the same wrong rules its code did; both errors survived until raw bytes were
    // captured. Comparison is case-insensitive because getHeaders() lower-cases names while the
    // wire keeps the caller's casing — which cannot change any byte count, so lengths are
    // asserted separately and exactly.
    const keepAlive = new Agent();

    const shapes: Array<[string, http.ClientRequestArgs]> = [
        ['plain GET', { headers: { 'x-y': 'z' } }],
        ['keep-alive agent', { headers: { 'x-y': 'z' }, agent: keepAlive }],
        ['connection close', { headers: { 'x-y': 'z' }, agent: false }],
        ['explicit connection', { headers: { connection: 'close', 'x-y': 'z' } }],
        [
            'keepAlive false, maxSockets finite',
            { agent: new http.Agent({ keepAlive: false, maxSockets: 100 }), headers: { 'x-y': 'z' } },
        ],
        [
            'keepAlive false, maxSockets Infinity',
            { agent: new http.Agent({ keepAlive: false }), headers: { 'x-y': 'z' } },
        ],
        ['cookie array of two', { headers: { cookie: ['a=1', 'b=2'] } }],
        ['cookie array of one', { headers: { cookie: ['a=1'] } }],
        ['cookie array of five', { headers: { cookie: ['a=1', 'b=2', 'c=3', 'd=4', 'e=5'] } }],
        ['cookie as a string', { headers: { cookie: 'a=1; b=2' } }],
        ['non-cookie array', { headers: { 'x-a': ['1', '2', '3'] } }],
        ['mixed-case names', { headers: { 'Content-Type': 'text/html', 'X-Req-Uri': '/a/b' } }],
        ['latin1 value', { headers: { 'x-n': 'café-ü' } }],
        ['numeric value', { headers: { 'x-num': 42 } }],
        ['empty value', { headers: { 'x-e': '' } }],
        ['auth from userinfo', { auth: 'user:secret', headers: { 'x-y': 'z' } }],
        ['long path', { path: `/${'p'.repeat(3000)}`, headers: { 'x-y': 'z' } }],
        [
            'many headers',
            { headers: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`x-h${i}`, 'v'.repeat(i * 7)])) },
        ],
        ['HEAD', { method: 'HEAD', headers: { 'x-y': 'z' } }],
    ];

    for (const [label, args] of shapes) {
        it(`serializes exactly what node serializes: ${label}`, () => {
            const request = http.request({ host: 'example.invalid', path: '/frag?a=1', ...args });
            request.on('error', () => {});

            try {
                const reconstructed = serializeOutgoingRequest(request);
                const authoritative = materialize(request);

                expect(reconstructed, `${label} should be reconstructable`).to.be.a('string');
                expect(measureHeadTotal(reconstructed!), `byte count for ${label}`).to.equal(
                    measureHeadTotal(authoritative),
                );
                expect(reconstructed!.toLowerCase(), `structure for ${label}`).to.equal(authoritative.toLowerCase());
            } finally {
                request.destroy();
            }
        });
    }

    it('refuses a request that may carry a body', () => {
        // node appends Content-Length or Transfer-Encoding from private state no public API
        // exposes, so reconstruction would under-count by ~28 bytes.
        const request = http.request({ host: 'example.invalid', path: '/x', method: 'POST' });
        request.on('error', () => {});

        expect(serializeOutgoingRequest(request)).to.equal(null);
        request.destroy();
    });

    it('refuses a transport with no getHeaders, such as an HTTP/2 stream', () => {
        expect(serializeOutgoingRequest({ method: 'GET', path: '/x' })).to.equal(null);
    });

    it('refuses a request with no path rather than serializing the string "undefined"', () => {
        expect(serializeOutgoingRequest({ method: 'GET', getHeaders: () => ({ 'x-y': 'z' }) })).to.equal(null);
    });

    it('refuses when getHeaders() cannot see the headers, as with a flat array', () => {
        const request = http.request({ host: 'example.invalid', path: '/x', agent: false, headers: ['X-A', '1'] });
        request.on('error', () => {});

        expect(serializeOutgoingRequest(request)).to.equal(null);
        request.destroy();
    });

    it('over-counts rather than under-counts when uniqueHeaders joins an array', () => {
        // uniqueHeaders has no public getter, so reconstruction cannot see it: it writes one
        // line per entry where node writes one joined line. The safe direction.
        const request = http.request({
            host: 'example.invalid',
            path: '/x',
            agent: false,
            headers: { 'x-a': ['1', '2'] },
            uniqueHeaders: ['x-a'],
        } as http.ClientRequestArgs);
        request.on('error', () => {});

        expect(measureHeadTotal(serializeOutgoingRequest(request)!)).to.be.above(
            measureHeadTotal(materialize(request)),
        );
        request.destroy();
    });
});

describe('headFor', () => {
    it('reconstructs when node has not serialized the head yet', () => {
        const request = http.request({ host: 'example.invalid', path: '/x', headers: { 'x-y': 'z' }, agent: false });
        request.on('error', () => {});

        expect(nodeHead(request), 'node should not have built it yet').to.equal(null);
        expect(headFor(request)).to.equal(serializeOutgoingRequest(request));
        request.destroy();
    });

    for (const [label, args] of [
        ['a forwarded expect header', { headers: { expect: '100-continue', 'x-y': 'z' } }],
        ['headers passed as a flat array', { headers: ['X-A', '1', 'X-B', '2'] }],
    ] as Array<[string, http.ClientRequestArgs]>) {
        it(`uses node's own head, exactly, for ${label}`, () => {
            // node builds the head inside the constructor for these shapes — the two cases
            // reconstruction handles badly or not at all. Preferring its buffer makes them
            // exact, and reads `_header` without ever calling `_implicitHeader()`, so this
            // cannot throw ERR_HTTP_HEADERS_SENT or alter the request's body framing.
            const request = http.request({ host: 'example.invalid', path: '/x', agent: false, ...args });
            request.on('error', () => {});

            const authoritative = nodeHead(request);

            expect(authoritative, 'node should have built it in the constructor').to.be.a('string');
            expect(headFor(request)).to.equal(authoritative);
            request.destroy();
        });
    }

    it('returns null when the head is neither available nor reconstructable', () => {
        const request = http.request({ host: 'example.invalid', path: '/x', method: 'POST' });
        request.on('error', () => {});

        expect(headFor(request)).to.equal(null);
        request.destroy();
    });
});

describe('the head node materializes', () => {
    // Detector for the private-API dependency: if a future node changes _header, this fails
    // rather than the guard silently drifting.
    it('matches the bytes node actually writes, for a request with every awkward shape', async () => {
        let materialized = '';

        const wire: string = await new Promise((resolve) => {
            const srv = net.createServer((sock) => {
                let buf = '';
                sock.on('data', (d) => {
                    buf += d.toString('latin1');
                    if (buf.includes('\r\n\r\n')) {
                        sock.end('HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n');
                        srv.close();
                        resolve(buf.slice(0, buf.indexOf('\r\n\r\n') + 4));
                    }
                });
            });
            srv.listen(0, '127.0.0.1', () => {
                const req = http.request({
                    host: '127.0.0.1',
                    port: (srv.address() as net.AddressInfo).port,
                    path: '/x?a=1',
                    auth: 'user:secret',
                    headers: { 'x-a': ['1', '2'], cookie: ['a=1', 'b=2'], 'x-u': 'é'.repeat(5), host: 'fwd.example' },
                });
                req.on('error', () => {});
                materialized = materialize(req);
                req.end();
            });
        });

        expect(materialized).to.be.a('string').and.to.not.equal('');
        expect(materialized).to.equal(wire);
        expect(measureHeadTotal(materialized)).to.equal(Buffer.byteLength(wire, 'latin1'));
    });
});
