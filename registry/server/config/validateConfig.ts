import { type RequestHandler } from 'express';
import Joi from 'joi';
import validateRequestFactory from '../common/services/validateRequest';
import { joiErrorToResponse } from '../util/helpers';
import { getLogger } from '../util/logger';
import { configService } from './ConfigService';

const schema = Joi.object({
    apps: Joi.array().items(Joi.object()).optional(),
    routes: Joi.array().items(Joi.object()).optional(),
    sharedLibs: Joi.array().items(Joi.object()).optional(),
});

const validateRequest = validateRequestFactory([
    {
        schema,
        selector: 'body',
    },
]);

const validateConfig: RequestHandler = async (req, res) => {
    try {
        await configService.upsert(req.body, { user: req.user!, dryRun: true });
        return res.status(200).json({ valid: true });
    } catch (error: any) {
        const logger = getLogger();
        logger.warn(error, 'Config validation failed: %O', req.body);
        const mappedError = configService.mapError(error);
        if (mappedError instanceof Joi.ValidationError) {
            return res.status(200).json({ valid: false, details: joiErrorToResponse(mappedError) });
        }
        return res.status(200).json({ valid: false, details: mappedError.message });
    }
};

export default [validateRequest, validateConfig];
