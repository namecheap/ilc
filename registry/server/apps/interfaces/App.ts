import Joi from '@hapi/joi';

export interface AppDependencies {
    [packageName: string]: string
}

export interface AppSSR {
    src: string,
    timeout: number,
    primary: boolean,
}

export interface AppInitProps {
    [propName: string]: any
}

export interface AppProps {
    [propName: string]: any,
}

export type AppName = string;

export interface CommonApp {
    name: AppName,
    spaBundle: string,
    cssBundle: string,
    assetsDiscoveryUrl?: string,
}

export interface AppBody extends CommonApp {
    dependencies?: AppDependencies,
    props?: AppProps,
    ssr: AppSSR,
    initProps?: AppInitProps,
}

export default interface App extends CommonApp {
    dependencies: string,
    ssr: string,
    initProps: string,
    props: string,
    assetsDiscoveryUpdatedAt?: number,
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

export const partialAppBodySchema = Joi.object({
    ...commonApp,
    name: appNameSchema.forbidden(),
});

export const appBodySchema = Joi.object({
    ...commonApp,
    name: appNameSchema.required(),
    spaBundle: commonApp.spaBundle.required(),
    cssBundle: commonApp.cssBundle.required(),
    ssr: commonApp.ssr.required(),
});

export const appsBodySchema = Joi.array().items(appBodySchema);
