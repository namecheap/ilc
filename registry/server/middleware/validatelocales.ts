import { Request, Response } from 'express';
import Joi from 'joi';

import { SettingKeys } from '../settings/interfaces';
import settingsService from '../settings/services/SettingsService';
import { getJoiErr, joiErrorToResponse } from '../util/helpers';

export const validateLocalesMiddleware =
    (
        localesFromRequest: (req: Request) => string[],
        unsupportedLocalesToFieldName: (unsupportedLocales: string[]) => string,
    ) =>
    async (req: Request, res: Response, next: () => void) => {
        const locales = localesFromRequest(req);

        if (locales.length === 0) {
            next();
            return;
        }

        const unsupportedLocales = await getUnsupportedLocales(locales);
        if (unsupportedLocales.length > 0) {
            res.status(422).send(
                joiErrorToResponse(
                    unsupportedLocalesToJoiError(unsupportedLocales, unsupportedLocalesToFieldName(unsupportedLocales)),
                ),
            );
            return;
        }

        next();
    };

async function getUnsupportedLocales(locales: string[]): Promise<string[]> {
    const supportedLocales = await settingsService.get<string[]>(SettingKeys.I18nSupportedLocales);
    if (supportedLocales === undefined) {
        throw new Error(`Setting ${SettingKeys.I18nSupportedLocales} is not set`);
    }
    return locales.filter((l) => !supportedLocales.includes(l));
}

function unsupportedLocalesToJoiError(unsupportedLocales: string[], field: string): Joi.ValidationError {
    return getJoiErr(
        `localizedVersions.${unsupportedLocales[0]}`,
        `Next locales are not supported ${unsupportedLocales.join(',')}. Either change request or change ${
            SettingKeys.I18nSupportedLocales
        } setting.`,
    );
}
