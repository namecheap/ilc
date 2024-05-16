import sessionKnex from 'connect-session-knex';
import { Express, RequestHandler } from 'express';
import session from 'express-session';
import { Logger } from 'ilc-plugins-sdk';
import passport from 'passport';

import { AuthProviders } from '../authEntities/interfaces';
import db from '../db';
import { userContextMiddleware } from '../middleware/userContext';
import { availableMethodsHandlerFactory } from './handlers/availableMethodsHandler';
import { localLoginHandlerFactory } from './handlers/localLoginHandler';
import { logoutHandlerFactory } from './handlers/logoutHandler';
import { openIdAuthCallbackHandlerFactory } from './handlers/openIdAuthCallbackHandler';
import { bearerAuthenticationMiddlewareFactory } from './middleware/bearerAuthenticationMiddleware';
import { initializeOpenIdMiddlewareFactory } from './middleware/initializeOpenIdMiddleware';
import { rolesMiddlewareFactory } from './middleware/rolesMiddleware';
import { validateSessionMiddlewareFactory } from './middleware/validateSessionMiddleware';
import { authService } from './services/AuthService';
import { OpenIdService } from './services/OpenIdService';
import { bearerStrategyFactory } from './strategies/bearer';
import { localStrategyFactory } from './strategies/local';

type SetupAuthOptions = {
    session?: session.SessionOptions;
};

export async function useAuth(
    app: Express,
    openIdService: OpenIdService,
    config: SetupAuthOptions,
    logger: Logger,
): Promise<RequestHandler[]> {
    const SessionKnex = sessionKnex(session);
    const sessionConfig = Object.assign(
        {
            resave: false,
            saveUninitialized: false,
            cookie: { httpOnly: true, secure: false },
            store: new SessionKnex({
                knex: db,
                createtable: false,
                tablename: 'sessions',
            }),
        },
        config.session,
    );

    if (app.get('env') === 'production') {
        app.set('trust proxy', 1); // trust first proxy
    }

    app.use(session(sessionConfig));

    passport.use(await localStrategyFactory(authService));
    passport.use(await bearerStrategyFactory(authService));

    // This can be used to keep a smaller payload
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (user: Express.User, done) {
        done(null, user);
    });

    // ...
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(userContextMiddleware);

    // Accept the OpenID identifier and redirect the user to their OpenID
    // provider for authentication.  When complete, the provider will redirect
    // the user back to the application at:
    //     /auth/openid/return
    const initializeOpenIdMiddleware = initializeOpenIdMiddlewareFactory(logger, openIdService, authService);

    app.get('/auth/openid', initializeOpenIdMiddleware, passport.authenticate(AuthProviders.OpenID));

    const openidReturnHandlers: RequestHandler[] = [
        initializeOpenIdMiddleware,
        validateSessionMiddlewareFactory(),
        openIdAuthCallbackHandlerFactory(logger),
    ];
    // The OpenID provider has redirected the user back to the application.
    // Finish the authentication process by verifying the assertion.  If valid,
    // the user will be logged in.  Otherwise, authentication has failed.
    app.get('/auth/openid/return', openidReturnHandlers); //Regular flow
    app.post('/auth/openid/return', openidReturnHandlers); //response_mode: 'form_post' flow

    // Accept passed username/password pair & perform an attempt to authenticate against local DB
    app.post('/auth/local', passport.authenticate(AuthProviders.Local), localLoginHandlerFactory());

    app.get('/auth/logout', logoutHandlerFactory());

    app.get('/auth/available-methods', availableMethodsHandlerFactory(openIdService));

    return [bearerAuthenticationMiddlewareFactory(), rolesMiddlewareFactory()];
}
