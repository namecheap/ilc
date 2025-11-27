import { type RequestHandler } from 'express';
import { type Logger } from 'ilc-plugins-sdk';
import passport from 'passport';
import { AuthProviders } from '../../authEntities/interfaces';

export function openIdAuthCallbackHandlerFactory(logger: Logger): RequestHandler {
    return function openIdAuthCallbackHandler(req, res, next) {
        passport.authenticate(
            AuthProviders.OpenID,
            (err: unknown, user: Express.User | false | null, info: { message: string }) => {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    logger.warn({ info }, 'Failed to login');
                    res.status(401);
                    res.header('Content-type', 'text/html');
                    return res.end(`<pre>${info.message}</pre><br><a href="/">Go to main page</a>`);
                }

                logger.info(`User ${user.identifier} authenticated via OpenID`);
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }

                    res.cookie('ilcUserInfo', JSON.stringify(user));
                    return res.redirect('/');
                });
            },
        )(req, res, next);
    };
}
