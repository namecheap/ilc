import axios from 'axios';
import * as Joi from 'joi';
import { AssetsManifestError } from './errors/AssetsManifestError';

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
            throw new AssetsManifestError(
                `"assetsDiscoveryUrl" ${assetsManifestUrl} is not available. Check the url via browser manually.`,
            );
        }

        return this.validate(assetsManifestContent);
    }

    private static async validate(assetsManifestContent: unknown): Promise<AssetsManifest> {
        const assetsManifestContentValidator = Joi.object<AssetsManifest>({
            spaBundle: Joi.string().required(),
            cssBundle: Joi.string().optional(),
            dependencies: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        });

        return await assetsManifestContentValidator.validateAsync(assetsManifestContent);
    }
}
