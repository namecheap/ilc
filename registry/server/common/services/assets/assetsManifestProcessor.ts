import _ from 'lodash';
import url from 'url';

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

export default function processManifest(baseUrl: string, manifest: any, whiteList: readonly string[]): ManifestData {
    const data = _.pick(manifest, whiteList) as IncomingManifest;
    if (data.spaBundle) {
        data.spaBundle = url.resolve(baseUrl, data.spaBundle);
    }

    if (data.cssBundle) {
        data.cssBundle = url.resolve(baseUrl, data.cssBundle);
    }

    if (
        data.dependencies !== undefined &&
        typeof data.dependencies === 'object' &&
        _.isPlainObject(data.dependencies)
    ) {
        data.dependencies = _.mapValues(data.dependencies, (v) => url.resolve(baseUrl, v));
        data.dependencies = JSON.stringify(data.dependencies);
    } else {
        delete data.dependencies;
    }

    return data as ManifestData;
}
