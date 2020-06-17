import _ from 'lodash';
import url from 'url';


export default function processManifest(baseUrl: string, manifest: any) {
    let data = _.pick(manifest, ['spaBundle', 'cssBundle', 'dependencies']);

    if (data.spaBundle) {
        data.spaBundle = url.resolve(baseUrl, data.spaBundle);
    }
    if (data.cssBundle) {
        data.cssBundle = url.resolve(baseUrl, data.cssBundle);
    }

    if (data.dependencies !== undefined && _.isPlainObject(data.dependencies)) {
        data.dependencies = _.mapValues(data.dependencies, v => url.resolve(baseUrl, v));
        data.dependencies = JSON.stringify(data.dependencies);
    } else {
        delete data.dependencies;
    }

    return data;
}
