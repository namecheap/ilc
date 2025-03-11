import { Request, Response } from 'express';

import Joi from 'joi';
import { AssetsManifestError } from '../../common/services/assets/errors/AssetsManifestError';
import { EntryFactory } from '../../common/services/entries/EntryFactory';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import { joiErrorToResponse } from '../../util/helpers';
import { App, appSchema } from '../interfaces';

const validateRequestBeforeCreateApp = validateRequestFactory([
    {
        schema: appSchema,
        selector: 'body',
    },
]);

const createApp = async (req: Request<{}, any, App>, res: Response): Promise<Response> => {
    const app = req.body;
    const appEntry = EntryFactory.getAppInstance();

    try {
        const results = await appEntry.create(app, { user: req.user });
        return res.status(200).send(preProcessResponse(results));
    } catch (error) {
        if (error instanceof Joi.ValidationError) {
            return res.status(422).send(joiErrorToResponse(error));
        } else if (error instanceof AssetsManifestError) {
            return res.status(error.code).send(error.message);
        }
        throw error;
    }
};

export default [validateRequestBeforeCreateApp, createApp];
