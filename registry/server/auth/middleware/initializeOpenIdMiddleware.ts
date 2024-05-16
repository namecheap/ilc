import { type RequestHandler } from 'express';
import { Logger } from 'ilc-plugins-sdk';
import passport from 'passport';
import { AuthProviders } from '../../authEntities/interfaces';
import { SettingsService } from '../../settings/services/SettingsService';
import { AuthService } from '../services/AuthService';
import { OpenIdService } from '../services/OpenIdService';
import { oidcStrategyFactory } from '../strategies/oidc';

export function initializeOpenIdMiddlewareFactory(
    logger: Logger,
    openIdService: OpenIdService,
    authService: AuthService,
): RequestHandler {
    return async function initializeOpenIdMiddleware(req, res, next) {
        if (!(await openIdService.isEnabled())) {
            return res.sendStatus(404);
        }

        if (req.user) {
            return res.redirect('/');
        }

        if (await openIdService.hasConfigurationChanged()) {
            logger.info('Change of the OpenID authentication config detected. Reinitializing auth backend...');
            passport.unuse(AuthProviders.OpenID);
            passport.use(AuthProviders.OpenID, await oidcStrategyFactory(openIdService, authService, logger));
        }

        next();
    };
}
