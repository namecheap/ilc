import JoiDefault from 'joi';

const Joi = JoiDefault.defaults(schema => {
    return schema.empty(null)
});

export default interface SharedLib {
    name: string;
    spaBundle: string;
    assetsDiscoveryUrl?: string;
    adminNotes?: string;
    l10nManifest?: string;
};

export const sharedLibNameSchema = Joi.string().trim().min(1);

const commonSharedLib = {
    spaBundle: Joi.string().trim().uri().default(null),
    assetsDiscoveryUrl: Joi.string().trim().uri().default(null),
    adminNotes: Joi.string().trim().default(null),
    l10nManifest: Joi.string().max(255).default(null),
};

export const partialSharedLibSchema = Joi.object({
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
