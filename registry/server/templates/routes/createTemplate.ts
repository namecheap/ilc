import { Request, Response } from 'express';

import validateRequestFactory from '../../common/services/validateRequest';
import { exhaustiveCheck } from '../../util/exhaustiveCheck';
import { joiErrorToResponse } from '../../util/helpers';
import { templatesRepository } from '../services/templatesRepository';
import { templateSchema, unsupportedLocalesToJoiError } from './validation';

const validateRequestBeforeCreateTemplate = validateRequestFactory([
    {
        schema: templateSchema,
        selector: 'body',
    },
]);

const createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await templatesRepository.createTemplate(req.body, req.user);
        switch (result.type) {
            case 'localeNotSupported': {
                res.status(422).send(joiErrorToResponse(unsupportedLocalesToJoiError(result.locales)));
                return;
            }
            case 'ok': {
                res.status(200).send(result.template);
                return;
            }
            default: {
                exhaustiveCheck(result);
            }
        }
    } catch (e) {
        res.status(500).send(JSON.stringify(e));
    }
};

export default [validateRequestBeforeCreateTemplate, createTemplate];
