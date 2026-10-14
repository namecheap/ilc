import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import * as httpErrors from './httpErrors';

import noticeError from './noticeError';
import { joiErrorToResponse } from '../util/helpers';
import { getLogger } from '../util/logger';

function logHandledError(req: Request, status: number, error: Error): void {
    const message = `${status} at ${req.method} ${req.originalUrl}: ${error.message ?? error.name}`;

    if (status >= 500) {
        getLogger().error(error, message);
    } else {
        getLogger().info(message);
    }
}

async function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): Promise<void> {
    if (error instanceof httpErrors.NotFoundError) {
        logHandledError(req, 404, error);
        res.status(404).send('Not found');
        return;
    }

    if (error instanceof Joi.ValidationError) {
        logHandledError(req, 422, error);
        res.status(422).send(joiErrorToResponse(error));
        return;
    }

    if (error instanceof httpErrors.ConflictError) {
        logHandledError(req, 409, error);
        res.status(409).send(error.message);
        return;
    }

    if (error instanceof httpErrors.UnprocessableContent) {
        logHandledError(req, 422, error);
        res.status(422).send(error.message);
        return;
    }

    if (error instanceof httpErrors.DBError || error instanceof httpErrors.CustomError) {
        logHandledError(req, 500, error);
        res.status(500).send(error.message);
        return;
    }

    const errorId = uuidv4();

    noticeError(error, {
        type: 'INTERNAL_SERVER_ERROR',
        errorId,
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(500).send(`Internal server error occurred. Error ID: ${errorId}`);
}

export default errorHandler;
