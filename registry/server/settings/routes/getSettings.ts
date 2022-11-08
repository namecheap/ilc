import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';

const getSettings = async (req: Request, res: Response): Promise<void> => {
    const query = db.select().from('settings');
    const settings = await query.range(req.query.range as string | undefined);

    res.setHeader('Content-Range', settings.pagination.total);
    res.status(200).send(preProcessResponse(settings.data));
};

export default [getSettings];
