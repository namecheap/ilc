import type { User } from '../../../../typings/User';
import {
    AUTHORIZATION_CODE_TTL_MS,
    DEFAULT_OAUTH_SCOPES,
    OAUTH_CLI_CLIENT_ID,
    OAUTH_SCOPES,
    OAuthError,
    type IssuedAccessToken,
    type OAuthAuthorizationRequest,
    type OAuthScope,
} from '../interfaces';
import type { OAuthAuthorizationCodesRepository } from '../repositories/OAuthAuthorizationCodesRepository';
import { isLoopbackRedirectUri } from '../util/loopbackRedirectUri';
import { generateAuthorizationCode, hashAuthorizationCode, verifyCodeChallenge } from '../util/pkce';
import type { SessionTokenService } from '../../session/SessionTokenService';

export interface AuthorizeParams {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    scope?: string;
    resource?: string;
}

export interface TokenParams {
    grantType: string;
    code: string;
    redirectUri: string;
    clientId: string;
    codeVerifier: string;
}

export class OAuthService {
    constructor(
        private readonly codes: OAuthAuthorizationCodesRepository,
        private readonly sessionTokens: SessionTokenService,
    ) {}

    /**
     * The client and its redirect URI. A failure here must be shown to the user, never sent to the redirect URI
     * (RFC 6749 section 4.1.2.1, first paragraph). The CLI is a public native client with a loopback redirect
     * (RFC 8252 sections 7.3 and 8.4).
     */
    validateClient(clientId: string, redirectUri: string): void {
        if (clientId !== OAUTH_CLI_CLIENT_ID) {
            throw new OAuthError('invalid_client', `Unknown client "${clientId}"`);
        }
        if (!isLoopbackRedirectUri(redirectUri)) {
            throw new OAuthError(
                'invalid_request',
                'redirect_uri must be a loopback address: http://127.0.0.1:<port>/... or http://localhost:<port>/...',
            );
        }
    }

    /**
     * The rest of the authorize request (RFC 6749 section 4.1.1), once the client and the redirect URI are trusted.
     * `resource` (RFC 8707) may only name this Registry, which is its own and only resource server.
     */
    validateAuthorizeRequest(params: AuthorizeParams, issuer: string): OAuthAuthorizationRequest {
        this.validateClient(params.clientId, params.redirectUri);

        if (params.resource !== undefined && trimSlash(params.resource) !== trimSlash(issuer)) {
            throw new OAuthError('invalid_target', `resource must be this registry, ${issuer}`);
        }

        return {
            clientId: params.clientId,
            redirectUri: params.redirectUri,
            codeChallenge: params.codeChallenge,
            scopes: parseScopes(params.scope),
            state: params.state,
        };
    }

    /**
     * Issues the one-time code the signed-in user takes back to the client (RFC 6749 section 4.1.2). The code is
     * short-lived and single use, bound to the client, the redirect URI and the PKCE challenge (RFC 7636 section 4.4).
     */
    async issueAuthorizationCode(request: OAuthAuthorizationRequest, user: User, now = new Date()): Promise<string> {
        const code = generateAuthorizationCode();

        await this.codes.deleteExpired(now);
        await this.codes.create({
            codeHash: hashAuthorizationCode(code),
            clientId: request.clientId,
            redirectUri: request.redirectUri,
            codeChallenge: request.codeChallenge,
            scopes: request.scopes.join(' '),
            user,
            expiresAt: new Date(now.getTime() + AUTHORIZATION_CODE_TTL_MS),
        });

        return code;
    }

    /** Exchanges a code for a scoped session, RFC 6749 section 4.1.3 with the PKCE check of RFC 7636 section 4.6 */
    async exchangeAuthorizationCode(params: TokenParams, now = new Date()): Promise<IssuedAccessToken> {
        if (params.grantType !== 'authorization_code') {
            throw new OAuthError('unsupported_grant_type', 'Only the authorization_code grant is supported');
        }
        if (params.clientId !== OAUTH_CLI_CLIENT_ID) {
            throw new OAuthError('invalid_client', `Unknown client "${params.clientId}"`);
        }

        const row = await this.codes.consume(hashAuthorizationCode(params.code));
        if (!row) {
            throw new OAuthError('invalid_grant', 'The authorization code is unknown or was used already');
        }
        if (row.expiresAt.getTime() <= now.getTime()) {
            throw new OAuthError('invalid_grant', 'The authorization code has expired');
        }
        if (row.clientId !== params.clientId) {
            throw new OAuthError('invalid_grant', 'The authorization code was issued to another client');
        }
        if (row.redirectUri !== params.redirectUri) {
            throw new OAuthError('invalid_grant', 'redirect_uri does not match the authorization request');
        }
        if (!verifyCodeChallenge(params.codeVerifier, row.codeChallenge)) {
            throw new OAuthError('invalid_grant', 'code_verifier does not match the code challenge');
        }

        const scopes = parseScopes(row.scopes);
        return this.sessionTokens.issue(row.user, scopes, row.clientId, now);
    }

    async revoke(token: string): Promise<void> {
        await this.sessionTokens.revoke(token);
    }
}

/** The `scope` parameter: space separated, each one known, `override:sign` when absent (RFC 6749 section 3.3) */
export function parseScopes(scope: string | undefined): OAuthScope[] {
    if (scope === undefined || scope.trim() === '') {
        return DEFAULT_OAUTH_SCOPES;
    }

    const scopes = new Set<OAuthScope>();
    for (const value of scope.split(' ').filter((item) => item !== '')) {
        const known = OAUTH_SCOPES.find((item) => item === value);
        if (!known) {
            throw new OAuthError('invalid_scope', `Unknown scope "${value}", supported: ${OAUTH_SCOPES.join(' ')}`);
        }
        scopes.add(known);
    }

    return [...scopes];
}

function trimSlash(url: string): string {
    return url.replace(/\/+$/, '');
}
