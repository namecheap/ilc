import type { IncomingHttpHeaders } from 'http';
import { Readable } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';
import { MAX_BODY_BYTES } from './capacity-budget';
import type { RefusalReason } from '../types/refusal';

const NON_REPLAYABLE_HEADERS = ['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding'];
const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

/** A capture step either produced bytes, or refused for exactly one named reason. */
export type CaptureResult = { ok: true; body: Buffer } | { ok: false; reason: RefusalReason };

/**
 * Buffers the stream up to maxBodyBytes. A stream error still rejects: an upstream failure is an
 * error, not a refusal, and callers rely on it surfacing as one.
 */
export function readBounded(stream: Readable, maxBodyBytes: number = MAX_BODY_BYTES): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let total = 0;
        stream.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > maxBodyBytes) {
                // resolve before destroy(): the 'close' it triggers must not win the race and
                // report the truncation reason instead of the size one
                resolve({ ok: false, reason: 'body-too-large' });
                stream.destroy();
                return;
            }
            chunks.push(chunk);
        });
        stream.on('end', () => resolve({ ok: true, body: Buffer.concat(chunks, total) }));
        stream.on('close', () => resolve({ ok: false, reason: 'stream-closed-early' }));
        stream.on('error', reject);
    });
}

export async function decodeBounded(
    rawBody: Buffer,
    encoding: string | undefined,
    maxBodyBytes: number = MAX_BODY_BYTES,
): Promise<CaptureResult> {
    const normalizedEncoding = encoding?.trim().toLowerCase();
    if (normalizedEncoding === undefined || normalizedEncoding === 'identity') {
        return { ok: true, body: rawBody };
    }
    if (normalizedEncoding !== 'gzip' && normalizedEncoding !== 'deflate') {
        return { ok: false, reason: 'unsupported-encoding' };
    }

    try {
        const decompress = normalizedEncoding === 'gzip' ? gunzip : inflate;
        // maxOutputLength also caps decompression bombs: a small body inflating past the budget
        return { ok: true, body: (await decompress(rawBody, { maxOutputLength: maxBodyBytes })) as Buffer };
    } catch {
        return { ok: false, reason: 'decode-failed' };
    }
}

export function replayableHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
    return Object.fromEntries(
        Object.entries(headers).filter(([key]) => !NON_REPLAYABLE_HEADERS.includes(key.toLowerCase())),
    );
}
