import {
    Request,
    Response,
} from 'express';

import db from '../../db';

type DeleteAppsRequestBody = Array<string>;

const deleteApps = async (req: Request, res: Response) => {
    const appsNames: DeleteAppsRequestBody = req.body;

    await db('apps').whereIn('name', appsNames).delete();

    return res.status(200).send();
};

export default deleteApps;
