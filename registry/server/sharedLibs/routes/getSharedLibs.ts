import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getSharedLibs = async (req: Request, res: Response): Promise<void> => {
    const query = db.select().from('shared_libs');

    const sharedLibs = await query.range(req.query.range as string | undefined);

    res.setHeader('Content-Range', sharedLibs.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(sharedLibs.data));
};

export default [getSharedLibs];
