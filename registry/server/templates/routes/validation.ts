import Joi from 'joi';
import renderTemplate from '../services/renderTemplate';
import { getJoiErr, joiErrorToResponse } from '../../util/helpers';
import { Response } from 'express';
import settingsService from '../../settings/services/SettingsService';
import { SettingKeys } from '../../settings/interfaces';

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

export async function getUnsupportedLocales(locales: string[]): Promise<string[]> {
    const supportedLocales = await settingsService.get(SettingKeys.I18nSupportedLocales);
    return locales.filter((l) => !supportedLocales.includes(l));
}

export function unsupportedLocalesToJoiError(unsupportedLocales: string[]): Joi.ValidationError {
    return getJoiErr(
        `localizedVersions.${unsupportedLocales[0]}`,
        `Next locales are not supported ${unsupportedLocales.join(',')}. Either change request or change ${
            SettingKeys.I18nSupportedLocales
        } setting.`,
    );
}

export async function validateLocalesAreSupported(locales: string[], res: Response) {
    const unsupportedLocales = await getUnsupportedLocales(locales);
    if (unsupportedLocales.length > 0) {
        const joiError = unsupportedLocalesToJoiError(unsupportedLocales);
        res.status(422);
        res.send(joiErrorToResponse(joiError));
        return false;
    }

    return true;
}
