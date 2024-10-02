import Joi from 'joi';
import { SettingKeys } from '../../settings/interfaces';
import settingsService from '../../settings/services/SettingsService';
import { getJoiErr } from '../../util/helpers';
import renderTemplate from '../services/renderTemplate';

export const templateNameSchema = Joi.string().min(1).max(50);

const commonTemplate = {
    content: Joi.string()
        .min(1)
        .external(async (value) => {
            if (value === undefined) {
                return value;
            }

            try {
                await renderTemplate(value);
            } catch (e: any) {
                throw getJoiErr('content', e.message, value);
            }
        }),
    versionId: Joi.string().strip(),
};

export const localeNameSchema = Joi.string()
    .regex(/[a-z]{2}-[A-Z]{2,4}/)
    .min(5)
    .max(7);

export const localizedVersionSchema = Joi.object({
    content: commonTemplate.content.required(),
});

const localizedVersions = Joi.object().pattern(localeNameSchema, localizedVersionSchema);

export const partialTemplateSchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.forbidden(),
    localizedVersions,
});

export const templateSchema = Joi.object({
    ...commonTemplate,
    name: templateNameSchema.required(),
    content: commonTemplate.content.required(),
    localizedVersions,
});
