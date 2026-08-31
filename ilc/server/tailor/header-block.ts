export const MAX_LOGGED_HEADER_NAME = 64;

const CRLF = '\r\n';
const CRLF_BYTES = 2;
const HTTP_VERSION = 'HTTP/1.1';
const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

type HeaderValue = number | string | string[];

export interface LargestHeader {
    name: string;
    bytes: number;
}

export interface OutgoingRequest {
    method?: string;
    path?: string;
    agent?: { keepAlive?: boolean; maxSockets?: number } | false | null;
    getHeaders?: () => NodeJS.Dict<HeaderValue>;
}

export function measureHeadTotal(head: string): number {
    return byteLength(head);
}

/**
 * Largest single header line, CRLF included; the request line is excluded. Scans by index
 * rather than splitting: the head is attacker-influenced and can be tens of kilobytes, and
 * split() would allocate a copy of all of it to read one line at a time.
 */
export function findLargestHeader(head: string): LargestHeader {
    let largest: LargestHeader = { name: '', bytes: 0 };

    const requestLineEnd = head.indexOf(CRLF);

    if (requestLineEnd === -1) {
        return largest;
    }

    let start = requestLineEnd + CRLF.length;

    while (start < head.length) {
        const end = head.indexOf(CRLF, start);

        if (end === start) {
            break; // the blank line that terminates the block
        }

        // A head with no terminating CRLF still has a final line: a missing CRLF means
        // end-of-input, not termination, or that line would go uncounted. Both producers here
        // do terminate, but this is exported and can be handed any string.
        const lineEnd = end === -1 ? head.length : end;
        const bytes = lineEnd - start + CRLF_BYTES;

        if (bytes > largest.bytes) {
            const line = head.slice(start, lineEnd);
            largest = { name: truncateForLog(headerNameFromLine(line), MAX_LOGGED_HEADER_NAME), bytes };
        }

        start = lineEnd + CRLF.length;
    }

    return largest;
}

export function serializeOutgoingRequest(request: OutgoingRequest): string | null {
    if (!isSupportedRequest(request)) {
        return null;
    }

    const headers = request.getHeaders();

    if (Object.keys(headers).length === 0) {
        return null;
    }

    const lines = [`${request.method} ${request.path} ${HTTP_VERSION}`];

    for (const [name, value] of Object.entries(headers)) {
        if (value === undefined) {
            continue;
        }

        if (Array.isArray(value)) {
            if (value.length >= 2 && name === 'cookie') {
                lines.push(`${name}: ${value.join('; ')}`);
            } else {
                for (const entry of value) {
                    lines.push(`${name}: ${entry}`);
                }
            }

            continue;
        }

        lines.push(`${name}: ${value}`);
    }

    if (headers.connection === undefined) {
        lines.push(`Connection: ${shouldKeepAlive(request) ? 'keep-alive' : 'close'}`);
    }

    return `${lines.join(CRLF)}${CRLF}${CRLF}`;
}

export function headFor(request: OutgoingRequest): string | null {
    const materialized = (request as { _header?: string | null })._header;

    if (typeof materialized === 'string') {
        return materialized;
    }

    return serializeOutgoingRequest(request);
}

function isSupportedRequest(
    request: OutgoingRequest,
): request is OutgoingRequest & { method: string; path: string; getHeaders: () => NodeJS.Dict<HeaderValue> } {
    return (
        typeof request.method === 'string' &&
        BODYLESS_METHODS.has(request.method) &&
        typeof request.path === 'string' &&
        typeof request.getHeaders === 'function'
    );
}

function shouldKeepAlive(request: OutgoingRequest): boolean {
    const agent = request.agent;

    return !!agent && (agent.keepAlive === true || Number.isFinite(agent.maxSockets));
}

function headerNameFromLine(line: string): string {
    const separator = line.indexOf(':');

    return separator === -1 ? line : line.slice(0, separator);
}

/** latin1 is one byte per UTF-16 code unit, so this equals `value.length`; the name states intent. */
function byteLength(value: string): number {
    return Buffer.byteLength(value, 'latin1');
}

export function truncateForLog(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
