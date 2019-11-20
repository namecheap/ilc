import {
    Request,
    Response,
    NextFunction,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

const preProcessErrorResponse = _.compose<Array<Joi.ValidationError>, Array<Joi.ValidationErrorItem>, Array<string | undefined>, string>(
    _.join('\n'),
    _.map(_.get('message')),
    _.get('details'),
);

type SelectDataToValidate = (req: Request) => any;
export type ValidationPairs = Map<Joi.Schema, SelectDataToValidate>;

export const selectQueryToValidate: SelectDataToValidate = _.get('query');
export const selectBodyToValidate: SelectDataToValidate = _.get('body');

const validationMiddleware = (validationPairs: ValidationPairs) => async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        await Promise.all(_.map(
            async ([schema, selectDataToValidate]) => schema.validateAsync(selectDataToValidate(req)),
            Array.from(validationPairs)
        ));
        next();
    } catch (error) {
        res.status(422).send(preProcessErrorResponse(error));
    }
};

export default validationMiddleware;
