import url from 'url';
import { isPlainObject } from '../../../util/isPlainObject';

type IncomingManifest = {
    [key: string]: any;
    spaBundle: string;
    cssBundle?: string;
    dependencies?: object | string;
};

export type ManifestData = {
    spaBundle: string;
    cssBundle?: string;
    dependencies?: string;
};

export function processManifest(baseUrl: string, manifest: any, whiteList: readonly string[]): ManifestData {
    const source = Object(manifest);
    const data = Object.fromEntries(
        whiteList.filter((key) => key in source).map((key) => [key, source[key]]),
    ) as IncomingManifest;
    if (data.spaBundle) {
        data.spaBundle = url.resolve(baseUrl, data.spaBundle);
    }

    if (data.cssBundle) {
        data.cssBundle = url.resolve(baseUrl, data.cssBundle);
    }

    if (isPlainObject(data.dependencies)) {
        data.dependencies = JSON.stringify(
            Object.fromEntries(
                Object.entries(data.dependencies).map(([key, value]) => [key, url.resolve(baseUrl, value as string)]),
            ),
        );
    } else {
        delete data.dependencies;
    }

    return data as ManifestData;
}
