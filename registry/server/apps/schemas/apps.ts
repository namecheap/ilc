import Joi from '@hapi/joi';

const appDependenciesSchema = Joi.object().default({});
const appInitPropsSchema = Joi.object().default({});
const appPropsSchema = Joi.object().default({});
const appSpaBundleSchema = Joi.string().trim().uri();
const appCssBundleSchema = Joi.string().trim().uri();
const appAssetsDiscoveryUrlSchema = Joi.string().trim().uri();

const appSSRSchema = Joi.object({
    src: Joi.string().trim().uri().required(),
    timeout: Joi.number().required(),
    primary: Joi.boolean().required(),
});

export const appNameSchema = Joi.string().trim().min(1);

export const appBodySchema = Joi.object({
    name: appNameSchema.required(),
    spaBundle: appSpaBundleSchema.required(),
    cssBundle: appCssBundleSchema.required(),
    assetsDiscoveryUrl: appAssetsDiscoveryUrlSchema,
    dependencies: appDependenciesSchema,
    props: appPropsSchema,
    ssr: appSSRSchema.required(),
    initProps: appInitPropsSchema,
});

export const partialAppBodySchema = Joi.object({
    name: appNameSchema.optional(),
    spaBundle: appSpaBundleSchema.optional(),
    cssBundle: appCssBundleSchema.optional(),
    assetsDiscoveryUrl: appAssetsDiscoveryUrlSchema.optional(),
    dependencies: appDependenciesSchema.optional(),
    props: appPropsSchema.optional(),
    ssr: appSSRSchema.optional(),
    initProps: appInitPropsSchema.optional(),
});

const appsBodySchema = Joi.array().items(appBodySchema);

export default appsBodySchema;
