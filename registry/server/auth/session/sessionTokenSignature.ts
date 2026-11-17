import signature from 'cookie-signature';

/** The prefix express-session puts on its signed cookie value */
export const SESSION_TOKEN_PREFIX = 's:';

export function isSessionToken(token: string): boolean {
    return token.startsWith(SESSION_TOKEN_PREFIX);
}

/** Signs a session id the way express-session signs its cookie, so the token can be used as the cookie value */
export function signSessionId(sid: string, secret: string): string {
    return SESSION_TOKEN_PREFIX + signature.sign(sid, secret);
}

/** The session id of a token, null when it is not a session token or no secret signed it (express-session tries each) */
export function unsignSessionToken(token: string, secrets: string[]): string | null {
    if (!isSessionToken(token)) {
        return null;
    }

    const signed = token.slice(SESSION_TOKEN_PREFIX.length);
    for (const secret of secrets) {
        const sid = signature.unsign(signed, secret);
        if (sid !== false) {
            return sid;
        }
    }

    return null;
}
