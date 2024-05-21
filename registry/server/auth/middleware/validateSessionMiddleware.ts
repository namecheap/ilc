import { type RequestHandler } from 'express';

export function validateSessionMiddlewareFactory(): RequestHandler {
    return function validateSessionMiddleware(req, res, next) {
        if (!req.session.oidc) {
            return res.sendStatus(401);
        }
        next();
    };
}
