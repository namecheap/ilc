import Joi from '@hapi/joi';

const appDependenciesSchema = Joi.object().default({});

const appSSRSchema = Joi.object({
    src: Joi.string().trim().uri().required(),
    timeout: Joi.number().required(),
    primary: Joi.boolean().required(),
});

const appInitPropsSchema = Joi.object().default({});
const appPropsSchema = Joi.object().default({});
export const appNameSchema = Joi.string().trim().min(1);

export const appBodySchema = Joi.object({
    name: appNameSchema.required(),
    spaBundle: Joi.string().trim().uri().required(),
    cssBundle: Joi.string().trim().uri().required(),
    assetsDiscoveryUrl: Joi.string().trim().uri(),
    dependencies: appDependenciesSchema,
    props: appPropsSchema,
    ssr: appSSRSchema.required(),
    initProps: appInitPropsSchema,
});

const appsBodySchema = Joi.array().items(appBodySchema);

export default appsBodySchema;
