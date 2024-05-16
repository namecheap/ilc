import { RequestHandler } from 'express';
import passport from 'passport';

export function bearerAuthenticationMiddlewareFactory(): RequestHandler {
    return function bearerAuthenticationMiddleware(req, res, next) {
        if (!req.user) {
            return passport.authenticate('bearer', { session: false })(req, res, next);
        }

        return next();
    };
}
