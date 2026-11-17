import { RequestHandler } from 'express';
import passport from 'passport';

/**
 * Authenticates a request that carries an auth entity credential as a bearer token (RFC 6750 section 2.1,
 * `Authorization: Bearer base64(id):base64(secret)`), through passport's bearer strategy, without a session.
 * A request that is already authenticated, by the session cookie or by a session token, passes through.
 */
export function bearerAuthenticationMiddlewareFactory(): RequestHandler {
    return function bearerAuthenticationMiddleware(req, res, next) {
        if (!req.user) {
            return passport.authenticate('bearer', { session: false })(req, res, next);
        }

        return next();
    };
}
