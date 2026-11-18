import { RequestHandler } from 'express';
import passport from 'passport';
import { AuthProviders } from '../../authEntities/interfaces';

export function localLoginHandlerFactory(): RequestHandler {
    return function (req, res, next) {
        passport.authenticate(AuthProviders.Local, (err: unknown, user: Express.User | false | null) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.sendStatus(401);
            }

            // Passport regenerates the session on login, a pending OAuth authorize request is put back afterwards
            const oauthRequest = req.session.oauthRequest;
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }

                if (oauthRequest) {
                    req.session.oauthRequest = oauthRequest;
                }
                res.cookie('ilcUserInfo', JSON.stringify(user));
                res.sendStatus(200);
            });
        })(req, res, next);
    };
}
