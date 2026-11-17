import express, { type Router } from 'express';
import type { Logger } from 'ilc-plugins-sdk';
import { SlidingWindowRateLimiter } from '../../../util/SlidingWindowRateLimiter';
import type { OpenIdService } from '../../services/OpenIdService';
import type { OAuthService } from '../services/OAuthService';
import { OAUTH_AUTHORIZE_URL, authorizeHandlerFactory } from './authorize';
import { OAUTH_METADATA_URL, metadataHandlerFactory } from './metadata';
import { revokeHandlerFactory, tokenHandlerFactory } from './token';

const MINUTE_MS = 60 * 1000;
/** Token requests per client IP per minute; a code is single use and short-lived, this slows down guessing further */
const TOKEN_REQUESTS_PER_MINUTE = 30;

/**
 * The OAuth 2.1 authorization code flow for public clients (the Registry CLI and agents), mounted at the app root.
 * The token and revoke endpoints take a form-encoded body (RFC 6749 section 4.1.3), so they parse it themselves;
 * the app parses JSON only.
 */
export function createOAuthRouter(oauth: OAuthService, openIdService: OpenIdService, logger: Logger): Router {
    const router = express.Router();
    const form = express.urlencoded({ extended: false });
    const tokenRateLimiter = new SlidingWindowRateLimiter(TOKEN_REQUESTS_PER_MINUTE, MINUTE_MS);

    router.get(OAUTH_METADATA_URL, metadataHandlerFactory());
    router.get(OAUTH_AUTHORIZE_URL, authorizeHandlerFactory(oauth, openIdService, logger));
    router.post('/oauth/token', form, tokenHandlerFactory(oauth, tokenRateLimiter));
    router.post('/oauth/revoke', form, revokeHandlerFactory(oauth));

    return router;
}
