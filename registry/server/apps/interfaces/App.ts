import Joi from '@hapi/joi';

export interface AppDependencies {
    [packageName: string]: string
}

const appDependenciesSchema = Joi.object().default({});

export interface AppSSR {
    src: string,
    timeout: number,
    primary: boolean,
}

const appSSRSchema = Joi.object({
    src: Joi.string().trim().uri().required(),
    timeout: Joi.number().required(),
    primary: Joi.boolean().required(),
});

export interface AppInitProps {
    [propName: string]: any
}

const appInitPropsSchema = Joi.object().default({});

export interface AppProps {
    [propName: string]: any,
}

const appPropsSchema = Joi.object().default({});

export type AppName = string;

export interface CommonApp {
    name: AppName,
    spaBundle: string,
    cssBundle: string,
    assetsDiscoveryUrl?: string,
}

export const appNameSchema = Joi.string().trim().min(1);
const appSpaBundleSchema = Joi.string().trim().uri();
const appCssBundleSchema = Joi.string().trim().uri();
const appAssetsDiscoveryUrlSchema = Joi.string().trim().uri();

export interface AppBody extends CommonApp {
    dependencies?: AppDependencies,
    props?: AppProps,
    ssr: AppSSR,
    initProps?: AppInitProps,
}

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

/**
 * @todo It needs to avoid duplicate code with `appBodySchema`
 */
export const partialAppBodySchema = Joi.object({
    name: appNameSchema.forbidden(),
    spaBundle: appSpaBundleSchema.optional(),
    cssBundle: appCssBundleSchema.optional(),
    assetsDiscoveryUrl: appAssetsDiscoveryUrlSchema.optional(),
    dependencies: appDependenciesSchema.optional(),
    props: appPropsSchema.optional(),
    ssr: appSSRSchema.optional(),
    initProps: appInitPropsSchema.optional(),
});

export default interface App extends CommonApp {
    dependencies: string,
    ssr: string,
    initProps: string,
    props: string,
    assetsDiscoveryUpdatedAt?: number,
}

export const appsBodySchema = Joi.array().items(appBodySchema);
