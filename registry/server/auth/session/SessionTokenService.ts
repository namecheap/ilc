import crypto from 'node:crypto';
import session, { type CookieOptions, type SessionData, type Store } from 'express-session';
import type { User } from '../../../typings/User';
import { type IssuedAccessToken, type OAuthScope, type ScopedSession } from '../oauth/interfaces';
import { signSessionId, unsignSessionToken } from './sessionTokenSignature';

/** connect-session-knex keeps a row this long when the cookie has no max age */
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The session data of a scoped session as the store returns it */
export type ScopedSessionData = SessionData & ScopedSession & { passport: { user: User } };

/**
 * Issues and resolves access tokens that are Registry sessions: the token is the signed session id, exactly the
 * value of the `ilc-registry-session` cookie, so a token works in the Authorization header and as that cookie.
 * The rows are the ones express-session reads, created through the same store. In OAuth terms this is a reference
 * token: opaque to the client (RFC 6749 section 1.4), looked up server-side, with a fixed lifetime reported as
 * `expires_in` (RFC 6749 section 5.1) and no refresh token.
 */
export class SessionTokenService {
    constructor(
        private readonly store: Store,
        private readonly secrets: string[],
        private readonly cookie: CookieOptions,
    ) {
        if (secrets.length === 0) {
            throw new Error('A session secret is required to issue session tokens');
        }
    }

    async issue(user: User, scopes: OAuthScope[], client: string, now = new Date()): Promise<IssuedAccessToken> {
        const maxAge = this.cookie.maxAge ?? DEFAULT_MAX_AGE_MS;
        const absoluteExpiresAt = new Date(now.getTime() + maxAge);

        // express-session's Cookie: `maxAge` derives `expires`, and it serializes to the shape the store keeps
        const cookie = new session.Cookie();
        Object.assign(cookie, this.cookie, { maxAge });

        const sid = crypto.randomBytes(24).toString('base64url');
        const data: ScopedSessionData = {
            cookie,
            passport: { user },
            scopes,
            absoluteExpiresAt: absoluteExpiresAt.toISOString(),
            client,
        };

        await new Promise<void>((resolve, reject) => {
            this.store.set(sid, data, (err) => (err ? reject(err) : resolve()));
        });

        return {
            accessToken: signSessionId(sid, this.secrets[0]),
            expiresIn: Math.floor(maxAge / 1000),
            scopes,
        };
    }

    /**
     * The scoped session of a token, without touching its row. Null when the token is not signed by this Registry,
     * the row is gone, it is not a scoped session or its absolute expiry has passed.
     */
    async resolve(token: string, now = new Date()): Promise<ScopedSessionData | null> {
        const sid = unsignSessionToken(token, this.secrets);
        if (sid === null) {
            return null;
        }

        const data = await new Promise<SessionData | null | undefined>((resolve, reject) => {
            this.store.get(sid, (err, session) => (err ? reject(err) : resolve(session)));
        });

        if (!data || !isScopedSessionData(data) || isScopedSessionExpired(data, now)) {
            return null;
        }

        return data;
    }

    /** Destroys the session of the token; a token that resolves to nothing is ignored (RFC 7009 section 2.2) */
    async revoke(token: string): Promise<void> {
        const sid = unsignSessionToken(token, this.secrets);
        if (sid === null) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            this.store.destroy(sid, (err) => (err ? reject(err) : resolve()));
        });
    }
}

export function isScopedSessionData(data: SessionData): data is ScopedSessionData {
    return (
        Array.isArray(data.scopes) &&
        typeof data.absoluteExpiresAt === 'string' &&
        typeof data.passport?.user === 'object' &&
        data.passport.user !== null
    );
}

export function isScopedSessionExpired(scoped: ScopedSession, now = new Date()): boolean {
    const expiresAt = Date.parse(scoped.absoluteExpiresAt);
    return Number.isNaN(expiresAt) || expiresAt <= now.getTime();
}
