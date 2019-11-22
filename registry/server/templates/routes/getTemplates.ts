import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import Template from '../interfaces';
import {
    prepareTemplateToRespond,
} from '../services/prepareTemplate';

const getTemplates = async (req: Request, res: Response): Promise<void> => {
    const templates = await db.select().from<Template>('templates');

    res.status(200).send(_.map(prepareTemplateToRespond, templates));
};

export default getTemplates;
