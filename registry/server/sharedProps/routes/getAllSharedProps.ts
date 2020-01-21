import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    const sharedProps = await db.select().from('shared_props');

    res.status(200).send(preProcessResponse(sharedProps));
};

export default [getSharedProps];
