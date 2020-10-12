import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await db.select().from('settings');
    res.setHeader('Content-Range', settings.length);
    res.status(200).send(preProcessResponse(settings));
};

export default [getSettings];
