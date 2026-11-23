import express, { type RequestHandler, type Router } from 'express';

import { SlidingWindowRateLimiter } from '../../util/SlidingWindowRateLimiter';
import type { OverrideConfigSigningService } from '../services/OverrideConfigSigningService';
import { signOverrideConfig } from './signOverrideConfig';

const MINUTE_MS = 60 * 1000;

/**
 * A registry without a signing key answers 404 before authentication, so a client without a session learns that no
 * sign-in is needed and writes the unsigned cookie, as today. Whether signing is on is public anyway: the config
 * endpoint serves the public keys whenever a key is configured.
 */
function requireSigningConfigured(signingService: OverrideConfigSigningService): RequestHandler {
    return function signingConfiguredMiddleware(req, res, next) {
        if (!signingService.isConfigured()) {
            return res.status(404).send('Override config signing is not configured in this registry');
        }
        return next();
    };
}

/**
 * `authenticate` is the authentication and scope middleware, without the roles check: any authenticated user may
 * sign, read-only ones included, because an override only affects the browser that carries it.
 */
export function createOverrideConfigRouter(
    signingService: OverrideConfigSigningService,
    authenticate: RequestHandler[],
): Router {
    const router = express.Router();
    const rateLimiter = new SlidingWindowRateLimiter(signingService.rateLimitPerMinute, MINUTE_MS);

    router.post(
        '/sign',
        requireSigningConfigured(signingService),
        authenticate,
        signOverrideConfig(signingService, rateLimiter),
    );

    return router;
}
