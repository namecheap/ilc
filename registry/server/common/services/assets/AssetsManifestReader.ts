import axios from 'axios';
import { z } from 'zod';
import { parseInput } from '../../validation/validated';
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

// Unknown manifest fields are rejected
const assetsManifestSchema = z.strictObject({
    spaBundle: z.string().min(1),
    cssBundle: z.string().min(1).optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
});

export class AssetsManifestReader {
    public static async read(assetsManifestUrl: string): Promise<AssetsManifest> {
        let assetsManifestContent;

        try {
            const response = await axios.get(assetsManifestUrl, {
                responseType: 'json',
            });

            assetsManifestContent = response.data;
        } catch (error: any) {
            throw new AssetsManifestError({
                message: `"assetsDiscoveryUrl" ${assetsManifestUrl} is not available. Check the url via browser manually.`,
                cause: error,
            });
        }

        return this.validate(assetsManifestContent);
    }

    private static validate(assetsManifestContent: unknown): Promise<AssetsManifest> {
        return parseInput(assetsManifestSchema, assetsManifestContent);
    }
}
