import Joi from '@hapi/joi';

export type TemplateName = string;

export default interface Template {
    name: string,
    content: string,
};

export const templateNameSchema = Joi.string().min(1).max(50);

const commonTemplate = {
    content: Joi.string().min(1),
};

export const partialTemplateBodySchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.forbidden(),
});

export const templateBodySchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.required(),
    content: commonTemplate.content.required(),
});
