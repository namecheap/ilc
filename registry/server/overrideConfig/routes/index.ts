import express, { type RequestHandler, type Router } from 'express';

import { SlidingWindowRateLimiter } from '../../util/SlidingWindowRateLimiter';
import type { OverrideConfigSigningService } from '../services/OverrideConfigSigningService';
import { signOverrideConfig } from './signOverrideConfig';

const MINUTE_MS = 60 * 1000;

/**
 * `authenticate` is the authentication middleware alone, without the roles check: any authenticated user may sign,
 * read-only ones included, because an override only affects the browser that carries it.
 */
export function createOverrideConfigRouter(
    signingService: OverrideConfigSigningService,
    authenticate: RequestHandler,
): Router {
    const router = express.Router();
    const rateLimiter = new SlidingWindowRateLimiter(signingService.rateLimitPerMinute, MINUTE_MS);

    router.post('/sign', authenticate, signOverrideConfig(signingService, rateLimiter));

    return router;
}
