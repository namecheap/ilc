import JoiDefault from 'joi';
import db from "../../db";
import {getJoiErr} from "../../util/helpers";

const Joi = JoiDefault.defaults(schema => {
    return schema.empty(null)
});

export default interface App {
    name: string;
    spaBundle: string;
    cssBundle: string;
    assetsDiscoveryUrl?: string;
    dependencies?: string; // JSON({ [packageName: string]: string })
    props?: string; // JSON({ [propName: string]: any })
    ssrProps?: string; // JSON({ [propName: string]: any })
    configSelector?: string;
    ssr: string; // JSON({ src: string, timeout: number })
    wrappedWith?: string;
    discoveryMetadata?: string; // JSON({ [propName: string]: any })
    adminNotes?: string;
};

export const appNameSchema = Joi.string().trim().min(1);

const commonApp = {
    spaBundle: Joi.string().trim().uri().default(null),
    cssBundle: Joi.string().trim().uri().default(null),
    assetsDiscoveryUrl: Joi.string().trim().uri().default(null),
    dependencies: Joi.object().default({}),
    props: Joi.object().default({}),
    ssrProps: Joi.object().default({}),
    configSelector: Joi.array().items(Joi.string()).default([]),
    ssr: Joi.object({
        src: Joi.string().trim().uri(),
        timeout: Joi.number(),
    }).and('src', 'timeout').empty({}).default(null),
    kind: Joi.string().valid('primary', 'essential', 'regular', 'wrapper'),
    wrappedWith: Joi.when('kind', {
        is: 'wrapper',
        then: Joi.any().custom(() => null),
        otherwise: Joi.string().trim().default(null).external(async (value) => {
            if (value === null) {
                return null;
            }

            const wrapperApp = await db('apps').first('kind').where({ name: value });
            if (!wrapperApp || wrapperApp.kind !== 'wrapper') {
                throw getJoiErr('wrappedWith', 'Specified wrapper app is not a wrapper.');
            }

            return value;
        }),
    }),
    discoveryMetadata: Joi.object().default({}),
    adminNotes: Joi.string().trim().default(null),
    enforceDomain: Joi.number().default(null),
};

export const partialAppSchema = Joi.object({
    ...commonApp,
    name: appNameSchema.forbidden(),
});

export const appSchema = Joi.object({
    ...commonApp,
    name: appNameSchema.required(),
    spaBundle: Joi.when('assetsDiscoveryUrl', {
        is: commonApp.assetsDiscoveryUrl.exist(),
        then: commonApp.spaBundle,
        otherwise: commonApp.spaBundle.required(),
    }),
});
