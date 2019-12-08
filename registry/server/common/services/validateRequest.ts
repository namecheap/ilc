import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

const preProcessErrorResponse = _.compose<Array<Joi.ValidationError>, Array<Joi.ValidationErrorItem>, Array<string | undefined>, string>(
    _.join('\n'),
    _.map(_.get('message')),
    _.get('details'),
);

type SelectDataToValidate = (req: Request) => any;
interface ValidationConfig {
    schema: Joi.Schema,
    selector: SelectDataToValidate,
};

const validateRequestFactory = (validationConfig: ValidationConfig[]) => async (
    req: Request,
    res: Response,
) => {
    try {
        await Promise.all(_.map(
            async ({schema, selector}) => schema.validateAsync(selector(req)),
            validationConfig
        ));
    } catch (e) {
        res.status(422).send(preProcessErrorResponse(e));
        throw e;
    }
};

export default validateRequestFactory
