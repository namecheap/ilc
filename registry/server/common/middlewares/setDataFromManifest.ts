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

const setDataFromManifest = async (req: Request, res: Response, next: NextFunction) => {
    const entity = req.body;

    if (entity.assetsDiscoveryUrl) {
        let response;

        try {
            response = await axios.get(entity.assetsDiscoveryUrl, {
                responseType: 'json',
            });
        } catch (error) {
            console.error(`Caught an error while trying to fetch a manifest file from '${entity.assetsDiscoveryUrl}':`, error);
            res.status(422).send('"assetsDiscoveryUrl" is not available. Check the url via browser manually.');
            return;
        }

        const {
            spaBundle,
            cssBundle,
            dependencies,
        } = processManifest(entity.assetsDiscoveryUrl, response.data);

        if (spaBundle) {
            entity.spaBundle = spaBundle;
        } else {
            res.status(422).send('"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually');
            return;
        }

        if (cssBundle) {
            entity.cssBundle = cssBundle;
        }

        if (dependencies) {
            entity.dependencies = parseJSON(dependencies);
        }
    }

    next();
};

export default setDataFromManifest;
