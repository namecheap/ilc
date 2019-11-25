import Joi from '@hapi/joi';

interface AppDependencies {
    [packageName: string]: string
}

interface AppSSR {
    src: string,
    timeout: number,
    primary: boolean,
}

interface AppInitProps {
    [propName: string]: any
}

interface AppProps {
    [propName: string]: any,
}

export default interface App {
    name: string,
    spaBundle: string,
    cssBundle: string,
    assetsDiscoveryUrl?: string,
    dependencies?: AppDependencies,
    props?: AppProps,
    ssr: AppSSR,
    initProps?: AppInitProps,
}

export const appNameSchema = Joi.string().trim().min(1);

const commonApp = {
    spaBundle: Joi.string().trim().uri(),
    cssBundle: Joi.string().trim().uri(),
    assetsDiscoveryUrl: Joi.string().trim().uri(),
    dependencies: Joi.object().default({}),
    props: Joi.object().default({}),
    ssr: Joi.object({
        src: Joi.string().trim().uri().required(),
        timeout: Joi.number().required(),
        primary: Joi.boolean().required(),
    }),
    initProps: Joi.object().default({}),
};

export const partialAppSchema = Joi.object({
    ...commonApp,
    name: appNameSchema.forbidden(),
});

export const appSchema = Joi.object({
    ...commonApp,
    name: appNameSchema.required(),
    spaBundle: commonApp.spaBundle.required(),
    cssBundle: commonApp.cssBundle.required(),
    ssr: commonApp.ssr.required(),
});
