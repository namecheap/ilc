import { RequestHandler } from 'express';

export function localLoginHandlerFactory(): RequestHandler {
    return function (req, res) {
        res.cookie('ilcUserInfo', JSON.stringify(req.user));
        res.sendStatus(200);
    };
}
