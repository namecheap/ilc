import { ConnectSessionKnexStore } from 'connect-session-knex';
import { Express, RequestHandler } from 'express';
import session from 'express-session';
import { Logger } from 'ilc-plugins-sdk';
import passport from 'passport';

import { AuthProviders } from '../authEntities/interfaces';
import type { Knex } from 'knex';
import { userContextMiddleware } from '../middleware/userContext';
import { availableMethodsHandlerFactory } from './handlers/availableMethodsHandler';
import { localLoginHandlerFactory } from './handlers/localLoginHandler';
import { logoutHandlerFactory } from './handlers/logoutHandler';
import { openIdAuthCallbackHandlerFactory } from './handlers/openIdAuthCallbackHandler';
import { bearerAuthenticationMiddlewareFactory } from './middleware/bearerAuthenticationMiddleware';
import { initializeOpenIdMiddlewareFactory } from './middleware/initializeOpenIdMiddleware';
import { rolesMiddlewareFactory } from './middleware/rolesMiddleware';
import { sessionTokenAuthenticationMiddlewareFactory } from './middleware/sessionTokenAuthenticationMiddleware';
import {
    registryApiScope,
    scopedSessionMiddlewareFactory,
    scopesMiddlewareFactory,
} from './middleware/scopesMiddleware';
import { OAuthAuthorizationCodesRepository } from './oauth/repositories/OAuthAuthorizationCodesRepository';
import { createOAuthRouter } from './oauth/routes';
import { OAuthService } from './oauth/services/OAuthService';
import { SessionTokenService } from './session/SessionTokenService';
import { AuthService } from './services/AuthService';
import { OpenIdService } from './services/OpenIdService';
import { bearerStrategyFactory } from './strategies/bearer';
import { localStrategyFactory } from './strategies/local';
import { SESSION_COOKIE_NAME } from './session/sessionConfig';

type SetupAuthOptions = {
    session?: session.SessionOptions;
};

export const OPENID_CALLBACK_URL = '/auth/openid/return';

interface AuthServices {
    authService: AuthService;
    sessionTokens: SessionTokenService;
    oauthService: OAuthService;
}

/** The middlewares a protected router applies, in order */
export interface AuthMiddlewares {
    /** Authentication: a session token bearer, then an auth entity bearer; a session cookie is already applied */
    authenticate: RequestHandler[];
    /** Authorization for /api/v1: the scope check for scoped sessions, then the role check */
    authorize: RequestHandler[];
    /** `authenticate` followed by `authorize` */
    all: RequestHandler[];
}

/**
 * Wires authentication into the app: the session, the passport strategies, the login routes and the OAuth login
 * (authorization code with PKCE, RFC 6749 section 4.1 and RFC 7636; the access token is a scoped Registry session).
 */
export async function useAuth(
    app: Express,
    db: Knex,
    openIdService: OpenIdService,
    config: SetupAuthOptions,
    logger: Logger,
): Promise<AuthMiddlewares> {
    const store = new ConnectSessionKnexStore({ knex: db, createTable: false, tableName: 'sessions' });
    const sessionOptions = createSessionOptions(store, config);
    const services = createAuthServices(db, store, sessionOptions);

    useSession(app, sessionOptions);
    await registerStrategies(services.authService);
    mountAuthRoutes(app, services, openIdService, logger);

    const authenticate = [
        sessionTokenAuthenticationMiddlewareFactory(services.sessionTokens),
        bearerAuthenticationMiddlewareFactory(),
    ];
    const authorize = [scopesMiddlewareFactory(registryApiScope), rolesMiddlewareFactory()];

    return { authenticate, authorize, all: [...authenticate, ...authorize] };
}

function createSessionOptions(store: session.Store, config: SetupAuthOptions): session.SessionOptions {
    return Object.assign(
        {
            name: SESSION_COOKIE_NAME,
            resave: false,
            saveUninitialized: false,
            cookie: { httpOnly: true, secure: false },
            store,
        },
        config.session,
    );
}

/**
 * express-session takes one secret or a list: the first signs, all of them verify (secret rotation). The Registry
 * configures string secrets; the option's type also allows key objects, which the token signer does not take.
 */
function sessionSecrets(options: session.SessionOptions): string[] {
    const { secret } = options;
    const secrets = (Array.isArray(secret) ? secret : [secret]).filter(
        (value): value is string => typeof value === 'string',
    );
    if (secrets.length === 0) {
        throw new Error('auth.sessionSecret must be a string to sign sessions');
    }
    return secrets;
}

/** OAuth access tokens are session values signed like the cookie, with the same secrets and max age */
function createAuthServices(db: Knex, store: session.Store, options: session.SessionOptions): AuthServices {
    const sessionTokens = new SessionTokenService(
        store,
        sessionSecrets(options),
        typeof options.cookie === 'object' ? options.cookie : {},
    );

    return {
        authService: new AuthService(db),
        sessionTokens,
        oauthService: new OAuthService(new OAuthAuthorizationCodesRepository(db), sessionTokens),
    };
}

/** The session and the request-level user context, in the order express-session and passport need */
function useSession(app: Express, options: session.SessionOptions): void {
    if (app.get('env') === 'production') {
        app.set('trust proxy', 1); // trust first proxy
    }

    app.use(session(options));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(scopedSessionMiddlewareFactory());
    app.use(userContextMiddleware);
}

async function registerStrategies(authService: AuthService): Promise<void> {
    passport.use(await localStrategyFactory(authService));
    passport.use(await bearerStrategyFactory(authService));

    // The whole user is kept in the session; this can be used to keep a smaller payload
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (user: Express.User, done) {
        done(null, user);
    });
}

function mountAuthRoutes(app: Express, services: AuthServices, openIdService: OpenIdService, logger: Logger): void {
    // Accept the OpenID identifier and redirect the user to their OpenID
    // provider for authentication.  When complete, the provider will redirect
    // the user back to the application at:
    //     /auth/openid/return
    const initializeOpenIdMiddleware = initializeOpenIdMiddlewareFactory(logger, openIdService, services.authService);

    app.get('/auth/openid', initializeOpenIdMiddleware, passport.authenticate(AuthProviders.OpenID));

    const openidReturnHandlers: RequestHandler[] = [
        initializeOpenIdMiddleware,
        openIdAuthCallbackHandlerFactory(logger),
    ];
    // The OpenID provider has redirected the user back to the application.
    // Finish the authentication process by verifying the assertion.  If valid,
    // the user will be logged in.  Otherwise, authentication has failed.
    app.get(OPENID_CALLBACK_URL, openidReturnHandlers); //Regular flow
    app.post(OPENID_CALLBACK_URL, openidReturnHandlers); //response_mode: 'form_post' flow

    // Accept passed username/password pair & perform an attempt to authenticate against local DB
    app.post('/auth/local', localLoginHandlerFactory());

    app.get('/auth/logout', logoutHandlerFactory());

    app.get('/auth/available-methods', availableMethodsHandlerFactory(openIdService));

    // CLI and agent login: authorization code with PKCE, the token is a scoped session
    app.use(createOAuthRouter(services.oauthService, openIdService, logger));
}
