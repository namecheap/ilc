import { z } from 'zod';
import type { User } from '../../../../typings/User';

/**
 * What a scoped session may do. A session without scopes (the UI login) is limited by its role only; a session with
 * scopes is limited to them on top of the role, so a scope never exceeds the role.
 */
export enum OAuthScope {
    /** POST /api/v1/override-config/sign */
    OverrideSign = 'override:sign',
    /** Every GET under /api/v1 */
    RegistryRead = 'registry:read',
    /** Every non-GET under /api/v1 */
    RegistryWrite = 'registry:write',
}

export const OAUTH_SCOPES: OAuthScope[] = Object.values(OAuthScope);
export const DEFAULT_OAUTH_SCOPES: OAuthScope[] = [OAuthScope.OverrideSign];

/** The public client of the Registry CLI and agents: no secret, PKCE and a loopback redirect only */
export const OAUTH_CLI_CLIENT_ID = 'ilc-registry-cli';

/** How long an authorization code may be exchanged for a token */
export const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;

export const PKCE_CODE_CHALLENGE_METHOD = 'S256';

/** RFC 7636 section 4.1: 43 to 128 unreserved characters; a S256 challenge is 43 base64url characters */
const PKCE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

export const codeVerifierSchema = z
    .string()
    .regex(PKCE_PATTERN, 'code_verifier must be 43 to 128 unreserved characters');
export const codeChallengeSchema = z
    .string()
    .regex(PKCE_PATTERN, 'code_challenge must be 43 to 128 unreserved characters');

/** What the sessions table keeps for a scoped session, next to `cookie` and `passport` */
export interface ScopedSession {
    scopes: OAuthScope[];
    /** ISO date, the session is refused after it no matter how often the store row is touched */
    absoluteExpiresAt: string;
    /** The OAuth client the session was issued to */
    client: string;
}

/** A validated authorize request, kept in the session while the user signs in */
export interface OAuthAuthorizationRequest {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scopes: OAuthScope[];
    state: string;
}

/** Follows the `oauth_authorization_codes` table */
export interface OAuthAuthorizationCodeRow {
    /** SHA-256 hex of the code */
    codeHash: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    /** Space separated, as in the OAuth `scope` parameter */
    scopes: string;
    user: User;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}

/** Validated first: a wrong client or redirect URI is answered with an error page, never a redirect */
export const authorizeClientSchema = z.object({
    client_id: z.string().min(1),
    redirect_uri: z.string().min(1),
});

/** Validated once the redirect URI is trusted, every failure redirects there with an error (RFC 6749 4.1.2.1) */
export const authorizeRequestSchema = z.object({
    response_type: z.literal('code'),
    code_challenge: codeChallengeSchema,
    code_challenge_method: z.literal(PKCE_CODE_CHALLENGE_METHOD),
    state: z.string().min(1),
    scope: z.string().optional(),
    resource: z.string().optional(),
});

export const tokenRequestSchema = z.object({
    grant_type: z.string().min(1),
    code: z.string().min(1),
    redirect_uri: z.string().min(1),
    client_id: z.string().min(1),
    code_verifier: codeVerifierSchema,
});

export const revokeRequestSchema = z.object({
    token: z.string().min(1),
});

/** RFC 6749 section 4.1.2.1 and 5.2 error codes, plus RFC 8707 invalid_target */
export type OAuthErrorCode =
    | 'invalid_request'
    | 'invalid_client'
    | 'invalid_grant'
    | 'invalid_scope'
    | 'invalid_target'
    | 'unauthorized_client'
    | 'unsupported_grant_type'
    | 'unsupported_response_type'
    | 'access_denied';

export class OAuthError extends Error {
    constructor(
        public readonly code: OAuthErrorCode,
        public readonly description: string,
    ) {
        super(`${code}: ${description}`);
        this.name = 'OAuthError';
    }
}

export interface IssuedAccessToken {
    accessToken: string;
    /** Seconds */
    expiresIn: number;
    scopes: OAuthScope[];
}
