import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import type { SlidingWindowRateLimiter } from '../../util/SlidingWindowRateLimiter';
import { signOverrideConfigBodySchema } from '../interfaces';
import type { OverrideConfigSigningService } from '../services/OverrideConfigSigningService';

export function signOverrideConfig(
    signingService: OverrideConfigSigningService,
    rateLimiter: SlidingWindowRateLimiter,
): RequestHandler {
    return validated({ body: signOverrideConfigBodySchema }, async ({ body }, req, res) => {
        if (!signingService.isConfigured()) {
            res.status(404).send('Override config signing is not configured in this registry');
            return;
        }

        const user = req.user;
        if (!user) {
            res.status(401).send('Authentication is required to sign an override config');
            return;
        }

        if (!rateLimiter.tryAcquire(user.identifier)) {
            res.status(429).send(`Too many override config signing requests for "${user.identifier}"`);
            return;
        }

        res.status(200).send(await signingService.sign(body.value, user));
    });
}
