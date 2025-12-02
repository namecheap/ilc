import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import _ from 'lodash';
import { joiErrorToResponse } from '../../util/helpers';
import { getLogger } from '../../util/logger';

interface ValidationConfig {
    schema: Joi.Schema;
    selector: string;

    /**
     * Result object preserves originally provided fields
     */
    noDefaults?: boolean;
}

const validateRequestFactory =
    (validationConfig: ValidationConfig[]) => async (req: Request, res: Response, next: NextFunction) => {
        try {
            await Promise.all(
                _.map(validationConfig, async ({ schema, selector, noDefaults }) => {
                    const data: Record<string, unknown> | undefined = _.get(req, selector);

                    if (!data) {
                        return res.status(400).send(`Missing ${selector} in request`);
                    }

                    const validObj = await schema.validateAsync(data, { abortEarly: false });

                    let result = validObj;

                    if (noDefaults) {
                        result = Object.keys(validObj).reduce<Record<string, unknown>>((noDefaultsObject, key) => {
                            if (typeof data[key] !== 'undefined') {
                                noDefaultsObject[key] = validObj[key];
                            }

                            return noDefaultsObject;
                        }, {});
                    }

                    _.set(req, selector, result);
                }),
            );
            next();
        } catch (e: unknown) {
            res.status(422);
            if (e instanceof Joi.ValidationError) {
                getLogger().info(`Validation error at ${req.method} ${req.originalUrl}`, e);
                // TODO: this basically makes from an readable object just a text, which seems not very useful for API consumer
                // need to think how to introduce good validation responses, without breaking changes
                res.send(joiErrorToResponse(e));
            } else {
                getLogger().error('Unexpected validation error', e);
                res.send('Unexpected validation error');
            }
        }
    };

export default validateRequestFactory;
