import type { IncomingHttpHeaders } from 'http';

interface FragmentAttributes {
    public?: boolean | string;
    [key: string]: unknown;
}

const ACCEPT_HEADERS: readonly string[] = [
    'authorization',
    'accept-language',
    'referer',
    'user-agent',
    'x-request-uri',
    'x-request-host',
    'x-request-intl',
    'cookie',
];

export function filterHeaders(
    attributes: FragmentAttributes,
    request: { headers?: IncomingHttpHeaders },
    extraHeaders?: string[],
): Record<string, string> {
    const { public: isPublic } = attributes;
    const { headers = {} } = request;
    // Headers are not forwarded to public fragment for security reasons

    if (isPublic) {
        return {};
    }

    const allowedHeaders =
        extraHeaders && extraHeaders.length > 0
            ? [...ACCEPT_HEADERS, ...extraHeaders.map((h) => h.toLowerCase())]
            : ACCEPT_HEADERS;

    return Object.keys(headers).reduce<Record<string, string>>((newHeaders, key) => {
        const value = headers[key];
        if ((allowedHeaders.includes(key) || key.startsWith('x-forwarded')) && value) {
            newHeaders[key] = value as string;
        }

        return newHeaders;
    }, {});
}
