import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import Template from '../interfaces';

const getTemplates = async (req: Request, res: Response): Promise<void> => {
    const templates = await db.select().from<Template>('templates');

    res.setHeader('Content-Range', templates.length); //Stub for future pagination capabilities
    res.status(200).send(templates);
};

export default [getTemplates];
