import {
    Request,
    Response,
    NextFunction,
} from 'express';
import axios from 'axios';

import {
    parseJSON,
} from '../services/json';
import processManifest from '../services/assetsManifestProcessor';
import AssetsDiscoveryWhiteLists from '../services/AssetsDiscoveryWhiteLists';

const setDataFromManifest = async (entity: Record<string, any>, entityName: string) => {
    if (entity.assetsDiscoveryUrl) {
        let response;

        try {
            response = await axios.get(entity.assetsDiscoveryUrl, {
                responseType: 'json',
            });
        } catch (error) {
            console.error(`Caught an error while trying to fetch a manifest file from '${entity.assetsDiscoveryUrl}':`, error);
            throw new Error('"assetsDiscoveryUrl" is not available. Check the url via browser manually.');
        }

        const {
            spaBundle,
            cssBundle,
            dependencies,
        } = processManifest(entity.assetsDiscoveryUrl, response.data, AssetsDiscoveryWhiteLists[entityName]);

        if (spaBundle) {
            entity.spaBundle = spaBundle;
        } else {
            throw new Error('"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually');
        }

        if (cssBundle) {
            entity.cssBundle = cssBundle;
        }

        if (dependencies) {
            entity.dependencies = parseJSON(dependencies);
        }
    }
};

export default setDataFromManifest;
