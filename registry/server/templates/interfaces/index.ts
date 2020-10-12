import Joi from 'joi';

export default interface Template {
    name: string,
    content: string,
};

export const templateNameSchema = Joi.string().min(1).max(50);

const commonTemplate = {
    content: Joi.string().min(1),
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
