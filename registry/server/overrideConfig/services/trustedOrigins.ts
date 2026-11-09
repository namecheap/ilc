/**
 * A port of the trusted-origin check ILC applies to the override config cookie
 * (ilc/server/tailor/parse-override-config.ts), so the Registry can refuse to sign a value ILC would strip.
 * ILC deletes an untrusted link; this module reports it instead. Keep the two in sync.
 */

interface TrustedOrigin {
    hostname: string;
    wildcardsCount: number;
    port: string | undefined;
}

/**
 * Links are resolved with the WHATWG URL parser, the same one the browser (SystemJS) and the SSR fragment request use,
 * so the host checked here is the host that is actually requested.
 * A relative link resolves differently depending on the scheme of the base: "http:evil.com/x.js" is a path against an
 * http base, but an absolute URL against an https base or with no base at all (SSR). So every link has to be safe
 * against both bases.
 */
const RELATIVE_LINK_HOST = 'ilc-override-config.invalid';
const RELATIVE_LINK_BASES = [`http://${RELATIVE_LINK_HOST}/`, `https://${RELATIVE_LINK_HOST}/`];

// Schemes a browser can load a script or a stylesheet from without a network host
const HOSTLESS_SCRIPTABLE_SCHEMES = ['data:', 'blob:', 'javascript:', 'vbscript:', 'file:', 'filesystem:'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHostname(hostname: string): string {
    return new URL(`http://${hostname}`).hostname.replace(/\.$/, '');
}

/**
 * Supported formats of a trusted origin:
 * - "foo.com", "1.1.1.1", "[::1]" - exact host
 * - "*.foo.com" - any subdomain of foo.com, but not foo.com itself
 * - "*.*.foo.com" - any subdomain of foo.com which has at least 2 more levels
 * - any of the above with ":<port>" - only this port
 */
function parseTrustedOrigin(trustedOrigin: string): TrustedOrigin | null {
    const [, host, port] = /^(\[[^\]]*\]|[^:/?#@\s]*)(?::(\d+))?$/.exec(trustedOrigin.trim()) || [];
    if (!host) {
        return null;
    }

    const labels = host.split('.');
    const wildcardsCount = labels.findIndex((label) => label !== '*');
    const baseHost = labels.slice(wildcardsCount).join('.');
    if (wildcardsCount === -1 || baseHost.includes('*')) {
        return null;
    }

    try {
        return { hostname: normalizeHostname(baseHost), wildcardsCount, port };
    } catch {
        return null;
    }
}

/** The `overrideConfigTrustedOrigins` setting: a comma-separated list, `localhost` is always trusted */
export function parseTrustedOrigins(trustedOrigins: unknown): TrustedOrigin[] {
    const origins = typeof trustedOrigins === 'string' ? trustedOrigins.split(',') : [];
    origins.push('localhost');

    return origins
        .map((origin) => parseTrustedOrigin(origin))
        .filter((origin): origin is TrustedOrigin => origin !== null);
}

/**
 * The URL parser drops the default port of the scheme ("https://foo.com:443" has an empty port),
 * so the trusted port is normalized by the same parser for the scheme of the link instead of a list of default ports.
 */
function isSamePort(url: URL, port: string): boolean {
    try {
        return new URL(`${url.protocol}//${RELATIVE_LINK_HOST}:${port}`).port === url.port;
    } catch {
        return false;
    }
}

function isTrustedOrigin(url: URL, trustedOrigins: TrustedOrigin[]): boolean {
    const hostname = url.hostname.replace(/\.$/, '');

    return trustedOrigins.some((trustedOrigin) => {
        if (trustedOrigin.port !== undefined && !isSamePort(url, trustedOrigin.port)) {
            return false;
        }

        if (trustedOrigin.wildcardsCount === 0) {
            return hostname === trustedOrigin.hostname;
        }

        if (!hostname.endsWith(`.${trustedOrigin.hostname}`)) {
            return false;
        }

        const subdomainLabels = hostname.slice(0, -trustedOrigin.hostname.length - 1).split('.');
        return subdomainLabels.length >= trustedOrigin.wildcardsCount && subdomainLabels.every(Boolean);
    });
}

function isSafeLinkForBase(link: string, base: string, trustedOrigins: TrustedOrigin[]): boolean {
    let url;
    try {
        url = new URL(link, base);
    } catch {
        // Neither the browser nor the SSR request can load it, but there is no reason to keep it either
        return false;
    }

    if (url.host === RELATIVE_LINK_HOST) {
        return true;
    }

    if (url.host) {
        return isTrustedOrigin(url, trustedOrigins);
    }

    return !HOSTLESS_SCRIPTABLE_SCHEMES.includes(url.protocol);
}

export function isSafeLink(link: string, trustedOrigins: TrustedOrigin[]): boolean {
    return RELATIVE_LINK_BASES.every((base) => isSafeLinkForBase(link, base, trustedOrigins));
}

function walkStrings(value: unknown, visit: (value: string) => void): void {
    if (typeof value === 'string') {
        visit(value);
    } else if (isPlainObject(value) || Array.isArray(value)) {
        Object.values(value).forEach((item) => walkStrings(item, visit));
    }
}

/** Every string in the object, at any depth, that ILC would remove as an untrusted link */
export function findUntrustedLinks(value: unknown, trustedOrigins: TrustedOrigin[]): string[] {
    const untrusted: string[] = [];
    walkStrings(value, (link) => {
        if (!isSafeLink(link, trustedOrigins)) {
            untrusted.push(link);
        }
    });
    return untrusted;
}

/** The distinct hosts of every absolute link in the object, at any depth, for the audit log */
export function collectLinkHosts(value: unknown): string[] {
    const hosts = new Set<string>();
    walkStrings(value, (link) => {
        try {
            const { host } = new URL(link);
            if (host) {
                hosts.add(host);
            }
        } catch {
            // Not an absolute link
        }
    });
    return [...hosts];
}
