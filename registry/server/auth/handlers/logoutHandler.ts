import { type RequestHandler } from 'express';

export function logoutHandlerFactory(): RequestHandler {
    return function logoutHandler(req, res, next) {
        req.logout((err) => {
            if (err) return next(err);
            res.clearCookie('ilc:userInfo');

            if (req.session) {
                req.session.regenerate((err) => {
                    if (err) {
                        next(err);
                    }
                    res.redirect('/');
                });
            } else {
                res.redirect('/');
            }
        });
    };
}
