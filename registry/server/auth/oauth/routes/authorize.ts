import type { Request, RequestHandler, Response } from 'express';
import type { Logger } from 'ilc-plugins-sdk';
import { z } from 'zod';
import type { OpenIdService } from '../../services/OpenIdService';
import {
    OAuthError,
    authorizeClientSchema,
    authorizeRequestSchema,
    type OAuthAuthorizationRequest,
    type OAuthErrorCode,
} from '../interfaces';
import type { OAuthService } from '../services/OAuthService';
import { configuredBaseUrl, issuerFromRequest } from '../util/issuer';

/** The route a login comes back to, with the request it continues kept in the session */
export const OAUTH_AUTHORIZE_URL = '/oauth/authorize';

/** The admin UI uses hash routing, so the route and its query go after the `#` */
const SPA_LOGIN_ROUTE = '/login';
const SPA_OAUTH_ERROR_ROUTE = '/oauth/error';

function firstIssue(error: z.ZodError): string {
    const [issue] = error.issues;
    return issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'Invalid request';
}

function spaUrl(route: string, params: Record<string, string>): string {
    const query = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    return `/#${route}?${query}`;
}

/** An authorize request that cannot be sent back to the client (RFC 6749 section 4.1.2.1, the first paragraph) */
function redirectToErrorPage(res: Response, error: OAuthErrorCode, description: string): void {
    res.redirect(spaUrl(SPA_OAUTH_ERROR_ROUTE, { error, error_description: description }));
}

function redirectWithError(
    res: Response,
    redirectUri: string,
    error: OAuthErrorCode,
    description: string,
    state: unknown,
): void {
    const location = new URL(redirectUri);
    location.searchParams.set('error', error);
    location.searchParams.set('error_description', description);
    if (typeof state === 'string' && state !== '') {
        location.searchParams.set('state', state);
    }
    res.redirect(location.toString());
}

/**
 * The request to continue: the one in the query when the client just arrived, otherwise the one kept in the
 * session over the login. Undefined once an error response was sent.
 */
function resolveAuthorizeRequest(
    req: Request,
    res: Response,
    oauth: OAuthService,
): OAuthAuthorizationRequest | undefined {
    if (req.query.client_id === undefined) {
        const pending = req.session.oauthRequest;
        if (!pending) {
            redirectToErrorPage(res, 'invalid_request', 'There is no authorization request to continue');
        }
        return pending;
    }

    const client = authorizeClientSchema.safeParse(req.query);
    if (!client.success) {
        redirectToErrorPage(res, 'invalid_request', firstIssue(client.error));
        return undefined;
    }

    try {
        oauth.validateClient(client.data.client_id, client.data.redirect_uri);
    } catch (error) {
        if (error instanceof OAuthError) {
            redirectToErrorPage(res, error.code, error.description);
            return undefined;
        }
        throw error;
    }

    const { redirect_uri: redirectUri } = client.data;
    const rest = authorizeRequestSchema.safeParse(req.query);
    if (!rest.success) {
        redirectWithError(res, redirectUri, 'invalid_request', firstIssue(rest.error), req.query.state);
        return undefined;
    }

    try {
        return oauth.validateAuthorizeRequest(
            {
                clientId: client.data.client_id,
                redirectUri,
                codeChallenge: rest.data.code_challenge,
                state: rest.data.state,
                scope: rest.data.scope,
                resource: rest.data.resource,
            },
            issuerFromRequest(req),
        );
    } catch (error) {
        if (error instanceof OAuthError) {
            redirectWithError(res, redirectUri, error.code, error.description, rest.data.state);
            return undefined;
        }
        throw error;
    }
}

async function continueAuthorization(
    req: Request,
    res: Response,
    request: OAuthAuthorizationRequest,
    oauth: OAuthService,
    logger: Logger,
): Promise<void> {
    const user = req.user;
    if (!user) {
        throw new Error('continueAuthorization needs a signed-in user');
    }

    delete req.session.oauthRequest;

    const code = await oauth.issueAuthorizationCode(request, user);
    logger.info(
        `User ${user.identifier} authorized ${request.clientId} with scopes "${request.scopes.join(' ')}" via OAuth`,
    );

    const location = new URL(request.redirectUri);
    location.searchParams.set('code', code);
    location.searchParams.set('state', request.state);
    res.redirect(location.toString());
}

/**
 * GET /oauth/authorize: the authorization endpoint of RFC 6749 section 4.1.1 with PKCE (RFC 7636 section 4.3). A
 * signed-in user gets a code at once; otherwise the request waits in the session while the user logs in, through
 * OpenID when it is enabled and through the admin UI login page otherwise, which comes back here afterwards.
 */
export function authorizeHandlerFactory(
    oauth: OAuthService,
    openIdService: OpenIdService,
    logger: Logger,
): RequestHandler {
    return async function authorizeHandler(req, res, next) {
        try {
            // A session limited to scopes must not mint a session with more of them
            if (req.scopedSession) {
                return redirectToErrorPage(res, 'access_denied', 'A scoped session cannot authorize a client');
            }

            const request = resolveAuthorizeRequest(req, res, oauth);
            if (!request) {
                return;
            }

            if (req.user) {
                return await continueAuthorization(req, res, request, oauth, logger);
            }

            if (await openIdService.isEnabled()) {
                // The OpenID provider redirects back to the configured base URL, and the login state lives in that
                // host's session cookie, so a request that came through another host moves there first, query and all.
                // Otherwise the callback finds no state: "Unable to verify authorization request state".
                const baseUrl = await configuredBaseUrl(openIdService);
                if (baseUrl !== undefined && new URL(baseUrl).origin !== issuerFromRequest(req)) {
                    return res.redirect(`${baseUrl}${req.originalUrl}`);
                }
                req.session.oauthRequest = request;
                return res.redirect('/auth/openid');
            }

            req.session.oauthRequest = request;

            res.redirect(
                spaUrl(SPA_LOGIN_ROUTE, {
                    returnTo: OAUTH_AUTHORIZE_URL,
                    client: request.clientId,
                    scope: request.scopes.join(' '),
                }),
            );
        } catch (error) {
            next(error);
        }
    };
}
