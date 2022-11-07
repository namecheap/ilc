import axios from 'axios';
import * as Joi from 'joi';

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
            throw new Error(`"assetsDiscoveryUrl" ${assetsManifestUrl}  is not available. Check the url via browser manually.`);
        }

        return this.validate(assetsManifestContent);
    }

    private static validate(assetsManifestContent: unknown): Promise<AssetsManifest> {
        const assetsManifestContentValidator = Joi.object<AssetsManifest>({
            spaBundle: Joi.string().uri().required(),
            cssBundle: Joi.string().uri().optional(),
            dependencies: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        });


        return assetsManifestContentValidator.validateAsync(assetsManifestContent);
    }
}
