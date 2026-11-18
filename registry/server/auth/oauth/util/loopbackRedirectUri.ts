const LOOPBACK_HOSTS = ['127.0.0.1', '[::1]', 'localhost'];

/**
 * RFC 8252 section 7.3: a native public client listens on the loopback interface on a port it picks at run time,
 * so any port is accepted. `localhost` is accepted next to the loopback IPs because the Registry CLI runs on the
 * developer's machine. Only plain http, as the RFC describes, and no fragment (RFC 6749 section 3.1.2).
 */
export function isLoopbackRedirectUri(redirectUri: string): boolean {
    let url: URL;
    try {
        url = new URL(redirectUri);
    } catch {
        return false;
    }

    return url.protocol === 'http:' && LOOPBACK_HOSTS.includes(url.hostname) && url.hash === '';
}
