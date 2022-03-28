import Joi from 'joi';
import {getJoiErr} from '../../util/helpers';
import renderTemplate from '../services/renderTemplate';

export default interface Template {
    name: string;
    content: string;
};

export interface LocalizedTemplate {
    templateName: string;
    content: string;
    locale: string;
}

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

const localizedVersions = Joi.object().pattern(Joi.string().regex(/[a-z]{2}-[A-Z]{2,4}/).min(5).max(7), Joi.object({
    content: commonTemplate.content.required()
}));

export const partialTemplateSchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.forbidden(),
    localizedVersions
});

export const templateSchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.required(),
    content: commonTemplate.content.required(),
    localizedVersions
});
