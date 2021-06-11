import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { AppsByMetadata } from '../interfaces';

const getAppsByMetadata = async (req: Request, res: Response): Promise<void> => {
    const apps = await db.select('name', 'discoveryMetadata').from('apps');

    const response: AppsByMetadata = preProcessResponse(apps);

    res.status(200).send(response);
};

export default [getAppsByMetadata];
