import uuidv4 from 'uuid/v4';
import {Request, Response, NextFunction} from 'express';
import * as httpErrors from './httpErrors';

import noticeError from './noticeError';

async function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): Promise<void> {
    if (error instanceof httpErrors.HttpError) {
        res.status(404).send('Not found');
        return;
    }

    if (error instanceof httpErrors.DBError || error instanceof httpErrors.CustomError) {
        res.status(500).send(error.message);
        return;
    }

    const errorId = uuidv4();

    noticeError(error, {
        type: 'INTERNAL_SERVER_ERROR',
        errorId
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(500).send(`Internal server error occurred. Error ID: ${errorId}`);
};

export default errorHandler;
