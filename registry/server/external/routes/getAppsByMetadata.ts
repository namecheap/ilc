import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { AppsByMetadata } from '../interfaces';

const getAppsByMetadata = async (req: Request, res: Response): Promise<void> => {
    const apps = await db.select('name', 'discoveryMetadata').from('apps');

    let response: AppsByMetadata = preProcessResponse(apps);

    if (Object.keys(req.query).length) {
        response = response.filter((app) => {
            if (!app.discoveryMetadata || !Object.keys(app.discoveryMetadata).length) {
                return false;
            }

            for (const [key, value] of Object.entries(req.query)) {
                // if app doesn't have at least one query field then remove it from response
                if (app.discoveryMetadata[key] !== value) {
                    return false;
                }
            }

            return true;
        });
    }

    res.status(200).send(response);
};

export default [getAppsByMetadata];
