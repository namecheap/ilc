import { AssetsManifestReader, AssetsManifest } from './AssetsManifestReader';

export class AssetsDiscoveryProcessor {
    /** The checked manifest of an entity with an assets discovery URL, nothing for one without */
    public static async fetchManifest<T>(
        assetsDiscoveryUrl: string | null | undefined,
        validate: (manifest: AssetsManifest) => Promise<T>,
    ): Promise<Partial<T>> {
        if (!assetsDiscoveryUrl) {
            return {};
        }
        return validate(await this.process(assetsDiscoveryUrl));
    }

    public static async process(assetsDiscoveryUrl: string) {
        const assetsManifest = await AssetsManifestReader.read(assetsDiscoveryUrl);

        const processedManifest = this.processManifest(assetsDiscoveryUrl, assetsManifest);

        return processedManifest;
    }

    private static processManifest(baseUrl: string, manifest: AssetsManifest): AssetsManifest {
        let data: AssetsManifest = {
            spaBundle: this.toURL(baseUrl, manifest.spaBundle),
        };

        if (manifest.cssBundle) {
            data.cssBundle = this.toURL(baseUrl, manifest.cssBundle);
        }

        if (manifest.dependencies !== undefined) {
            data.dependencies = Object.keys(manifest.dependencies).reduce<typeof manifest.dependencies>((acc, key) => {
                if (!manifest.dependencies) {
                    return acc;
                }

                acc[key] = this.toURL(baseUrl, manifest.dependencies[key]);
                return acc;
            }, {});
        }

        return data;
    }

    private static toURL(baseUrl: string, path: string) {
        const url = new URL(path, baseUrl);
        return url.href;
    }
}
