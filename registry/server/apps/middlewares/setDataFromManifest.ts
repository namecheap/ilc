import {
    Request,
    Response,
    NextFunction,
} from 'express';
import axios from 'axios';

import {
    parseJSON,
} from '../../common/services/json';
import processManifest from '../../common/services/assetsManifestProcessor';

const setDataFromManifest = async (req: Request, res: Response, next: NextFunction) => {
    const app = req.body;

    if (app.assetsDiscoveryUrl) {
        let response;

        try {
            response = await axios.get(app.assetsDiscoveryUrl, {
                responseType: 'json',
            });
        } catch (error) {
            console.error(`Caught an error while trying to fetch a manifest file from '${app.assetsDiscoveryUrl}':`, error);
            res.status(422).send('"spaBundle" can not be taken from a manifest file by provided "assetsDiscoveryUrl"');
            return;
        }

        const {
            spaBundle,
            cssBundle,
            dependencies,
        } = processManifest(app.assetsDiscoveryUrl, response.data);

        if (spaBundle) {
            app.spaBundle = spaBundle;
        } else {
            res.status(422).send('"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually');
            return;
        }

        if (cssBundle) {
            app.cssBundle = cssBundle;
        }

        if (dependencies) {
            app.dependencies = parseJSON(dependencies);
        }
    }

    next();
};

export default setDataFromManifest;
