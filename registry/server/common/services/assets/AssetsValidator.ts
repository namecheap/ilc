import { z } from 'zod';
import { parseInput } from '../../validation/validated';
import { ApplicationAssetsManifest, AssetsManifest, SharedLibAssetsManifest } from './AssetsManifestReader';

// Unknown manifest fields are dropped
const sharedLibManifestSchema = z.object({
    spaBundle: z.url(),
});

const appManifestSchema = z.object({
    spaBundle: z.url(),
    cssBundle: z.url().optional(),
    dependencies: z.record(z.string().min(1), z.string().min(1)).optional(),
});

export class AssetsValidator {
    public static maybeSharedLib(maybeSharedLibAssetsManifest: AssetsManifest): Promise<SharedLibAssetsManifest> {
        return parseInput(sharedLibManifestSchema, maybeSharedLibAssetsManifest);
    }

    public static maybeApp(maybeAppAssetsManifest: AssetsManifest): Promise<ApplicationAssetsManifest> {
        return parseInput(appManifestSchema, maybeAppAssetsManifest);
    }
}
