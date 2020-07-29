import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    let sharedProps = await db.select().from('auth_entities');
    sharedProps = sharedProps.map(v => {
        delete v.secret;
        return v;
    });

    res.setHeader('Content-Range', sharedProps.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(sharedProps));
};

export default [getSharedProps];
