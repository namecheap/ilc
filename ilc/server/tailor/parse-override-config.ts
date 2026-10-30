import LZUTF8 from 'lzutf8';
import type { OverrideConfig } from './merge-configs';

type Logger = Pick<Console, 'warn'>;

interface TrustedOrigin {
    hostname: string;
    wildcardsCount: number;
    port: string | undefined;
}

interface ParsedOverrideConfig {
    apps?: Record<string, { ssr?: { src?: unknown; ignoreInvalidSsl?: boolean } }>;
    sharedLibs?: Record<string, unknown>;
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

function parseTrustedOrigins(trustedOrigins: unknown): TrustedOrigin[] {
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

function isSafeLink(link: string, trustedOrigins: TrustedOrigin[]): boolean {
    return RELATIVE_LINK_BASES.every((base) => isSafeLinkForBase(link, base, trustedOrigins));
}

function sanitizeSpoofedLinks(
    obj: Record<string, unknown> | unknown[],
    trustedOrigins: TrustedOrigin[],
    logger?: Logger,
): void {
    Object.entries(obj).forEach(([key, value]) => {
        if (isPlainObject(value) || Array.isArray(value)) {
            sanitizeSpoofedLinks(value, trustedOrigins, logger);
        } else if (typeof value === 'string') {
            if (!isSafeLink(value, trustedOrigins)) {
                if (logger) {
                    logger.warn(`Sanitized untrusted url from override config. key = ${key}, value = ${value}`);
                }

                delete (obj as Record<string, unknown>)[key];
            }
        }
    });
}

export function parseOverrideConfig(cookie: unknown, trustedOrigins?: unknown, logger?: Logger): OverrideConfig | null {
    try {
        const overrideConfigCookie =
            typeof cookie === 'string' && cookie.split(';').find((n) => n.trim().startsWith('ILC-overrideConfig'));
        if (!overrideConfigCookie) {
            return null;
        }
        const overrideConfigValue = overrideConfigCookie.replace(/^\s?ILC-overrideConfig=/, '');

        let overrideConfig: ParsedOverrideConfig;

        // We support https://github.com/rotemdan/lzutf8.js compression here to ensure we can fit cookie into 4096 bytes
        // in majority of the cases
        if (overrideConfigValue.startsWith('LZUTF8:')) {
            const compressedValue = overrideConfigValue.replace(/^LZUTF8:/, '');
            overrideConfig = JSON.parse(LZUTF8.decompress(LZUTF8.decodeBase64(compressedValue)));
        } else {
            overrideConfig = JSON.parse(decodeURIComponent(overrideConfigValue));
        }

        if (trustedOrigins !== 'all') {
            const parsedTrustedOrigins = parseTrustedOrigins(trustedOrigins);

            if (overrideConfig.apps) {
                sanitizeSpoofedLinks(overrideConfig.apps, parsedTrustedOrigins, logger);
            }

            if (overrideConfig.sharedLibs) {
                sanitizeSpoofedLinks(overrideConfig.sharedLibs, parsedTrustedOrigins, logger);
            }
        }

        /**
         * The following logic needs to ignore invalid SSL certificates for sources that use HTTPS protocol
         * It ignores certificates only when a developer uses LDE to work with ILC on production environment
         * Due to TailorX can not fetch necessary fragment information for SSR from local environment
         */
        if (overrideConfig.apps !== undefined) {
            for (const appName in overrideConfig.apps) {
                const ssr = overrideConfig.apps[appName].ssr;

                if (ssr !== undefined && typeof ssr.src === 'string' && ssr.src.startsWith('https:')) {
                    ssr.ignoreInvalidSsl = true;
                }
            }
        }

        return overrideConfig as OverrideConfig;
    } catch {
        return null;
    }
}
