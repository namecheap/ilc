import Joi from 'joi';
import {getJoiErr} from '../../util/helpers';
import renderTemplate from '../services/renderTemplate';

export default interface Template {
    name: string,
    content: string,
};

export const templateNameSchema = Joi.string().min(1).max(50);

const commonTemplate = {
    content: Joi.string().min(1).external(async (value) => {
        if (value === undefined) {
            return value;
        }

        try {
            await renderTemplate(value);
        } catch (e: any) {
            throw getJoiErr('content', e.message);
        }
    }),
};

export const partialTemplateSchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.forbidden(),
});

export const templateSchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.required(),
    content: commonTemplate.content.required(),
});
