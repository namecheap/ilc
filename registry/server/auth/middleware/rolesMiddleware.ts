import { type RequestHandler } from 'express';
import { AuthRoles } from '../../authEntities/interfaces';

export function rolesMiddlewareFactory(): RequestHandler {
    return function rolesMiddlewre(req, res, next) {
        if (req.user?.role === AuthRoles.readonly && req.method !== 'GET') {
            return res.status(403).send({
                message: `Access denied. "${req.user.identifier}" has "readonly" access.`,
            });
        }

        return next();
    };
}
