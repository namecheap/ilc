import JoiDefault from 'joi';

const Joi = JoiDefault.defaults((schema) => {
    return schema.empty(null);
});

export interface SharedLib {
    name: string;
    spaBundle: string;
    assetsDiscoveryUrl?: string | null;
    assetsDiscoveryUpdatedAt?: number | null;
    adminNotes?: string | null;
    l10nManifest?: string | null;
}

export const sharedLibNameSchema = Joi.string().trim().min(1);

const commonSharedLib = {
    spaBundle: Joi.string().trim().uri(),
    assetsDiscoveryUrl: Joi.string().trim().uri().default(null),
    adminNotes: Joi.string().trim(),
    l10nManifest: Joi.string().max(255),
    versionId: Joi.string().strip(),
};

export const partialSharedLibSchema = Joi.object<SharedLib>({
    ...commonSharedLib,
    name: sharedLibNameSchema.forbidden(),
});

export const sharedLibSchema = Joi.object({
    ...commonSharedLib,
    name: sharedLibNameSchema.required(),
    spaBundle: Joi.when('assetsDiscoveryUrl', {
        is: commonSharedLib.assetsDiscoveryUrl.exist(),
        then: commonSharedLib.spaBundle,
        otherwise: commonSharedLib.spaBundle.required(),
    }),
});
