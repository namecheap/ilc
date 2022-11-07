import * as Joi from 'joi';
import {ApplicationAssetsManifest, AssetsManifest, SharedLibAssetsManifest} from './AssetsManifestReader';

export class AssetsValidator {

    private static validationOptions = {
        abortEarly: true,
        allowUnknown: false,
    };

    public static forSharedLib(maybeSharedLibAssetsmanifest: AssetsManifest): Promise<SharedLibAssetsManifest> {
        const schema = Joi.object<SharedLibAssetsManifest>({
            spaBundle: Joi.string().uri().required(),
        });

        return schema.validateAsync(maybeSharedLibAssetsmanifest, this.validationOptions);
    }

    public static forApp(maybeAppAssetsmanifest: AssetsManifest): Promise<ApplicationAssetsManifest> {
        const schema = Joi.object<ApplicationAssetsManifest>({
            spaBundle: Joi.string().uri().required(),
            cssBundle: Joi.string().uri().optional(),
            dependencies: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        });

        return schema.validateAsync(maybeAppAssetsmanifest, this.validationOptions);
    }
}
