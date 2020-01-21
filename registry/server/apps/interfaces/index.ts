import Joi from '@hapi/joi';

export default interface App {
    name: string,
    spaBundle: string,
    cssBundle: string,
    assetsDiscoveryUrl?: string,
    dependencies?: string, // JSON({ [packageName: string]: string })
    props?: string, // JSON({ [propName: string]: any })
    configSelector?: string,
    ssr: string, // JSON({ src: string, timeout: number })
    initProps?: string, // JSON({ [propName: string]: any })
}

export const appNameSchema = Joi.string().trim().min(1);

const commonApp = {
    spaBundle: Joi.string().trim().uri(),
    cssBundle: Joi.string().trim().uri(),
    assetsDiscoveryUrl: Joi.string().trim().uri(),
    dependencies: Joi.object().default({}),
    props: Joi.object().default({}),
    configSelector: Joi.array().items(Joi.string()),
    ssr: Joi.object({
        src: Joi.string().trim().uri().required(),
        timeout: Joi.number().required(),
    }),
    initProps: Joi.object().default({}),
    kind: Joi.string().valid('primary', 'essential', 'regular'),
};

export const partialAppSchema = Joi.object({
    ...commonApp,
    name: appNameSchema.forbidden(),
});

export const appSchema = Joi.object({
    ...commonApp,
    name: appNameSchema.required(),
    spaBundle: commonApp.spaBundle.required(),
});
