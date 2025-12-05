import { NextFunction, Request, RequestHandler, Response } from 'express';

export function unless(path: string | string[], middleware: RequestHandler): RequestHandler {
    return function (req: Request, res: Response, next: NextFunction) {
        const paths = Array.isArray(path) ? path : [path];
        if (paths.includes(req.url)) {
            return next();
        } else {
            return middleware(req, res, next);
        }
    };
}
