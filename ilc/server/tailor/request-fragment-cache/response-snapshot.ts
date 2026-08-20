import type { IncomingHttpHeaders } from 'http';
import { Readable } from 'stream';
import type { FragmentResponse } from './../fragment-render';
import { readBounded, decodeBounded, replayableHeaders } from './utils/capture';
import type { RefusalReason } from './types/refusal';

export class FragmentResponseSnapshot {
    private constructor(
        private readonly statusCode: number,
        private readonly headers: IncomingHttpHeaders,
        private readonly body: Buffer,
    ) {}

    get byteLength(): number {
        return this.body.length;
    }

    static async capture(
        response: FragmentResponse,
        maxBodyBytes?: number,
    ): Promise<{ ok: true; snapshot: FragmentResponseSnapshot } | { ok: false; reason: RefusalReason }> {
        const rawBody = await readBounded(response, maxBodyBytes);
        if (!rawBody.ok) {
            return rawBody;
        }

        const decoded = await decodeBounded(rawBody.body, response.headers['content-encoding'], maxBodyBytes);
        if (!decoded.ok) {
            return decoded;
        }

        return {
            ok: true,
            snapshot: new FragmentResponseSnapshot(
                response.statusCode,
                replayableHeaders(response.headers),
                decoded.body,
            ),
        };
    }

    replay(): FragmentResponse {
        const stream = new Readable({ read() {} });
        setImmediate(() => {
            stream.push(this.body);
            stream.push(null);
        });
        return Object.assign(stream, { statusCode: this.statusCode, headers: { ...this.headers } });
    }
}
