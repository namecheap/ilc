import * as Joi from 'joi';
import {ApplicationAssetsManifest, AssetsManifest, SharedLibAssetsManifest} from './AssetsManifestReader';

export class AssetsValidator {

    private static validationOptions = {
        allowUnknown: false,
        stripUnknown: true,
    };

    public static maybeSharedLib(maybeSharedLibAssetsManifest: AssetsManifest): Promise<SharedLibAssetsManifest> {
        const schema = Joi.object<SharedLibAssetsManifest>({
            spaBundle: Joi.string().uri().required(),
        });

        return schema.validateAsync(maybeSharedLibAssetsManifest, this.validationOptions);
    }

    public static maybeApp(maybeAppAssetsManifest: AssetsManifest): Promise<ApplicationAssetsManifest> {
        const schema = Joi.object<ApplicationAssetsManifest>({
            spaBundle: Joi.string().uri().required(),
            cssBundle: Joi.string().uri().optional(),
            dependencies: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        });

        return schema.validateAsync(maybeAppAssetsManifest, this.validationOptions);
    }
}
