import JoiDefault from 'joi';
import db from '../../db';
import { getJoiErr } from '../../util/helpers';

const Joi = JoiDefault.defaults((schema) => {
    return schema.empty(null);
});

export interface App {
    name: string;
    spaBundle?: string | null;
    cssBundle?: string | null;
    assetsDiscoveryUrl?: string | null;
    assetsDiscoveryUpdatedAt?: number | null;
    dependencies?: string | null; // JSON({ [packageName: string]: string })
    props?: string | null; // JSON({ [propName: string]: any })
    ssrProps?: string | null; // JSON({ [propName: string]: any })
    configSelector?: string | string[] | null; // JSON(string[])
    ssr?: string | null; // JSON({ src: string, timeout: number })
    kind: 'primary' | 'regular' | 'essential' | 'wrapper';
    wrappedWith?: string | null;
    discoveryMetadata?: string | null; // JSON({ [propName: string]: any })
    adminNotes?: string | null;
    enforceDomain?: number | null;
    l10nManifest?: string | null;
    namespace?: string | null;
}

export interface AppSsr {
    src: string;
    timeout: number;
}

export interface AppProps {
    [x: string]: any;
}

export interface AppSsrProps {
    [x: string]: any;
}

export interface AppDependencies {
    [x: string]: string;
}

export const appNameSchema = Joi.string().trim().min(1);

const commonApp = {
    spaBundle: Joi.string().trim().uri(),
    cssBundle: Joi.string().trim().uri(),
    assetsDiscoveryUrl: Joi.string().trim().uri().default(null),
    dependencies: Joi.object().default({}),
    props: Joi.object().default({}),
    ssrProps: Joi.object().default({}),
    configSelector: Joi.array().items(Joi.string()).default([]),
    ssr: Joi.object({
        src: Joi.string().trim().uri(),
        timeout: Joi.number(),
    })
        .and('src', 'timeout')
        .empty({})
        .default(null),
    kind: Joi.string().valid('primary', 'essential', 'regular', 'wrapper').default('regular'),
    wrappedWith: Joi.when('kind', {
        is: 'wrapper',
        then: Joi.any().custom(() => null),
        otherwise: Joi.string()
            .trim()
            .default(null)
            .external(async (value) => {
                if (!value) {
                    return null;
                }

                const wrapperApp = await db('apps').first('kind').where({ name: value });
                if (!wrapperApp || wrapperApp.kind !== 'wrapper') {
                    throw getJoiErr('wrappedWith', 'Specified wrapper app is not a wrapper.', wrapperApp);
                }

                return value;
            }),
    }),
    discoveryMetadata: Joi.object().default({}),
    adminNotes: Joi.string().trim(),
    enforceDomain: Joi.number().default(null),
    l10nManifest: Joi.string().max(255),
    versionId: Joi.string().strip(),
    namespace: Joi.string(),
};

export const partialAppSchema = Joi.object<App>({
    ...commonApp,
    name: appNameSchema.forbidden(),
});

export const appSchema = Joi.object<App>({
    ...commonApp,
    name: appNameSchema.required(),
});
