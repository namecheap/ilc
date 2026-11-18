import type { RequestHandler, Response } from 'express';
import type { SlidingWindowRateLimiter } from '../../../util/SlidingWindowRateLimiter';
import { OAuthError, revokeRequestSchema, tokenRequestSchema, type OAuthErrorCode } from '../interfaces';
import type { OAuthService } from '../services/OAuthService';

/** RFC 6749 section 5.2 */
function sendError(res: Response, status: number, error: OAuthErrorCode, description: string): void {
    res.status(status).json({ error, error_description: description });
}

function statusOf(error: OAuthError): number {
    return error.code === 'invalid_client' ? 401 : 400;
}

/** POST /oauth/token: answers RFC 6749 section 5.1, the token is a Registry session value */
export function tokenHandlerFactory(oauth: OAuthService, rateLimiter: SlidingWindowRateLimiter): RequestHandler {
    return async function tokenHandler(req, res, next) {
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');

        if (!rateLimiter.tryAcquire(req.ip ?? 'unknown')) {
            return sendError(res, 429, 'invalid_request', 'Too many token requests, try again later');
        }

        const body = tokenRequestSchema.safeParse(req.body);
        if (!body.success) {
            const [issue] = body.error.issues;
            return sendError(res, 400, 'invalid_request', `${issue?.path.join('.') ?? 'body'}: ${issue?.message}`);
        }

        try {
            const token = await oauth.exchangeAuthorizationCode({
                grantType: body.data.grant_type,
                code: body.data.code,
                redirectUri: body.data.redirect_uri,
                clientId: body.data.client_id,
                codeVerifier: body.data.code_verifier,
            });

            res.status(200).json({
                access_token: token.accessToken,
                token_type: 'Bearer',
                expires_in: token.expiresIn,
                scope: token.scopes.join(' '),
            });
        } catch (error) {
            if (error instanceof OAuthError) {
                return sendError(res, statusOf(error), error.code, error.description);
            }
            next(error);
        }
    };
}

/** POST /oauth/revoke: RFC 7009, 200 whether or not the token was live */
export function revokeHandlerFactory(oauth: OAuthService): RequestHandler {
    return async function revokeHandler(req, res, next) {
        res.set('Cache-Control', 'no-store');

        const body = revokeRequestSchema.safeParse(req.body);
        if (!body.success) {
            return sendError(res, 400, 'invalid_request', 'token is required');
        }

        try {
            await oauth.revoke(body.data.token);
            res.sendStatus(200);
        } catch (error) {
            next(error);
        }
    };
}
