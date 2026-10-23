import { type RequestHandler } from 'express';
import Joi from 'joi';
import validateRequestFactory from '../common/services/validateRequest';
import { joiErrorToResponse } from '../util/helpers';
import { getLogger } from '../util/logger';
import type { ConfigService } from './ConfigService';

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

export function updateConfig(configService: ConfigService): RequestHandler[] {
    const updateConfigHandler: RequestHandler = async (req, res) => {
        try {
            await configService.upsert(req.body, { user: req.user! });
            return res.status(204).end();
        } catch (error: any) {
            const mappedError = configService.mapError(error);
            if (mappedError instanceof Joi.ValidationError) {
                return res.status(422).json({ details: joiErrorToResponse(mappedError) });
            }
            return res.status(422).json({ details: mappedError.message });
        }
    };

    return [validateRequest, updateConfigHandler];
}
