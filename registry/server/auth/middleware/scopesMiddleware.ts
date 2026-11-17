import type { Request, RequestHandler } from 'express';
import { OAuthScope, type ScopedSession } from '../oauth/interfaces';
import { isScopedSessionData, isScopedSessionExpired } from '../session/SessionTokenService';

/** The scope (RFC 6749 section 3.3) of a request under /api/v1: reads need registry:read, everything else registry:write */
export function registryApiScope(req: Request): OAuthScope {
    return req.method === 'GET' ? OAuthScope.RegistryRead : OAuthScope.RegistryWrite;
}

/**
 * Copies the scope limits of a cookie session onto the request, so the scope check reads one place whether the
 * session came as the cookie or as a bearer token. A session without scopes (the UI login) sets nothing.
 */
export function scopedSessionMiddlewareFactory(): RequestHandler {
    return function scopedSessionMiddleware(req, res, next) {
        if (req.session && isScopedSessionData(req.session)) {
            req.scopedSession = toScopedSession(req.session);
        }
        next();
    };
}

/**
 * Refuses a scoped session outside the scope the request needs. Runs after authentication; an unscoped session or
 * an auth entity bearer passes. The role check still applies on top, so a scope never exceeds the role.
 * An expired session answers 401 and a missing scope 403, each with the `WWW-Authenticate` challenge of
 * RFC 6750 section 3.1 (`invalid_token`, `insufficient_scope`) next to the JSON message the admin UI shows.
 */
export function scopesMiddlewareFactory(requiredScope: OAuthScope | ((req: Request) => OAuthScope)): RequestHandler {
    return function scopesMiddleware(req, res, next) {
        const scoped = req.scopedSession;
        if (!scoped) {
            return next();
        }

        // express-session touches the row on every request, the absolute expiry inside the data does not move
        if (isScopedSessionExpired(scoped)) {
            res.set('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The session has expired"');
            return res.status(401).send({ message: 'The session has expired' });
        }

        const scope = typeof requiredScope === 'function' ? requiredScope(req) : requiredScope;
        if (!scoped.scopes.includes(scope)) {
            res.set('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${scope}"`);
            return res.status(403).send({
                message: `Access denied. The session is limited to "${scoped.scopes.join(' ')}", "${scope}" is required.`,
            });
        }

        return next();
    };
}

export function toScopedSession(scoped: ScopedSession): ScopedSession {
    return { scopes: scoped.scopes, absoluteExpiresAt: scoped.absoluteExpiresAt, client: scoped.client };
}
