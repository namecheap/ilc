import type { RequestHandler } from 'express';
import { OAUTH_SCOPES, PKCE_CODE_CHALLENGE_METHOD } from '../interfaces';
import { issuerFromRequest } from '../util/issuer';

export const OAUTH_METADATA_URL = '/.well-known/oauth-authorization-server';

/** RFC 8414 authorization server metadata, derived from the request so it matches the URL the client used */
export function metadataHandlerFactory(): RequestHandler {
    return function metadataHandler(req, res) {
        const issuer = issuerFromRequest(req);
        res.json({
            issuer,
            authorization_endpoint: `${issuer}/oauth/authorize`,
            token_endpoint: `${issuer}/oauth/token`,
            revocation_endpoint: `${issuer}/oauth/revoke`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code'],
            code_challenge_methods_supported: [PKCE_CODE_CHALLENGE_METHOD],
            token_endpoint_auth_methods_supported: ['none'],
            revocation_endpoint_auth_methods_supported: ['none'],
            scopes_supported: OAUTH_SCOPES,
        });
    };
}
