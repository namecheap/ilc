import { RequestHandler } from 'express';
import { isSessionToken } from '../session/sessionTokenSignature';
import type { SessionTokenService } from '../session/SessionTokenService';
import { toScopedSession } from './scopesMiddleware';

const BEARER_PREFIX = /^Bearer\s+/i;

/**
 * Authenticates a request whose bearer token (RFC 6750 section 2.1) is a session value: the `s:` prefixed signed
 * session id that the OAuth token endpoint issued, the same value the session cookie carries. The token is opaque to
 * the client (RFC 6749 section 1.4); here it is unsigned and its row is read without being touched or extended.
 * A token the Registry did not sign, or whose session is gone or past its absolute expiry, is refused with 401 and
 * the `WWW-Authenticate` challenge of RFC 6750 section 3.1. Any other bearer token is left to the next middleware.
 */
export function sessionTokenAuthenticationMiddlewareFactory(sessionTokens: SessionTokenService): RequestHandler {
    return async function sessionTokenAuthenticationMiddleware(req, res, next) {
        if (req.user) {
            return next();
        }

        const authorization = req.get('authorization') ?? '';
        const token = BEARER_PREFIX.test(authorization) ? authorization.replace(BEARER_PREFIX, '').trim() : null;
        if (token === null || !isSessionToken(token)) {
            return next();
        }

        try {
            const session = await sessionTokens.resolve(token);
            if (!session) {
                res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
                return res.sendStatus(401);
            }

            req.user = session.passport.user;
            req.scopedSession = toScopedSession(session);
            return next();
        } catch (error) {
            return next(error);
        }
    };
}
