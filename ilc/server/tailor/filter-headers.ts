import type { IncomingHttpHeaders } from 'http';
import { pickHeaders, SHARED_RENDER_HEADERS, type FragmentRenderOptions } from './fragment-render';
import type { FragmentAttributes } from './fragment-attributes';

const ACCEPT_HEADERS: readonly string[] = [
    ...SHARED_RENDER_HEADERS,
    'authorization',
    'accept-language',
    'referer',
    'user-agent',
    'x-request-uri',
    'cookie',
];

export function filterHeaders(
    attributes: FragmentAttributes,
    request: { headers?: IncomingHttpHeaders },
    extraHeaders?: string[],
    renderOptions: FragmentRenderOptions = { mode: 'private' },
): Record<string, string> {
    const { public: isPublic } = attributes;
    const { headers = {} } = request;
    // Headers are not forwarded to public fragment for security reasons

    if (isPublic) {
        return {};
    }

    if (renderOptions.mode === 'shared') {
        return renderOptions.varyHeaders;
    }

    const allowedHeaders =
        extraHeaders && extraHeaders.length > 0
            ? [...ACCEPT_HEADERS, ...extraHeaders.map((h) => h.toLowerCase())]
            : ACCEPT_HEADERS;

    return pickHeaders(headers, (key) => allowedHeaders.includes(key) || key.startsWith('x-forwarded'));
}
