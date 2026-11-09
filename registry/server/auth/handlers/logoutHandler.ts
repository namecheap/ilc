import { type RequestHandler } from 'express';

import { SESSION_COOKIE_NAME } from '../sessionConfig';

/**
 * Destroys the session instead of regenerating it, so the browser keeps no session cookie after logout.
 * Clients such as the ILC Overrides extension read the presence of that cookie as "signed in".
 */
export function logoutHandlerFactory(): RequestHandler {
    return function logoutHandler(req, res, next) {
        req.logout((err) => {
            if (err) return next(err);
            res.clearCookie('ilcUserInfo');

            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        return next(err);
                    }
                    res.clearCookie(SESSION_COOKIE_NAME);
                    res.redirect('/');
                });
            } else {
                res.redirect('/');
            }
        });
    };
}
