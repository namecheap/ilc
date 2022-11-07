import axios from 'axios';
import * as Joi from 'joi';
import {AssetsManifestError} from './errors/AssetsManifestError';

interface BasicAssetsManifest {
    spaBundle: string;
}

export interface SharedLibAssetsManifest extends BasicAssetsManifest {}

export interface ApplicationAssetsManifest extends BasicAssetsManifest {
    cssBundle?: string;
    dependencies?: Record<string, string>;
}

export interface AssetsManifest extends ApplicationAssetsManifest {}

export class AssetsManifestReader {
    public static async read(assetsManifestUrl: string): Promise<AssetsManifest> {
        let assetsManifestContent;

        try {
            const response = await axios.get(assetsManifestUrl, {
                responseType: 'json',
            });

            assetsManifestContent = response.data;

        } catch (error) {
            throw new AssetsManifestError(`"assetsDiscoveryUrl" ${assetsManifestUrl} is not available. Check the url via browser manually.`);
        }

        return this.validate(assetsManifestContent);
    }

    private static async validate(assetsManifestContent: unknown): Promise<AssetsManifest> {
        const assetsManifestContentValidator = Joi.object<AssetsManifest>({
            spaBundle: Joi.string().uri().required(),
            cssBundle: Joi.string().uri().optional(),
            dependencies: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        });

        try {
            return await assetsManifestContentValidator.validateAsync(assetsManifestContent);
        } catch(error) {
            throw new AssetsManifestError('"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually');
        }
    }
}
