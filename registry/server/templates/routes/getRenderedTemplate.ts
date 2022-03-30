import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import noticeError from '../../errorHandler/noticeError';
import db from '../../db';
import Template, {
    LocalizedTemplate,
    templateNameSchema,
} from '../interfaces';
import validateRequestFactory from '../../common/services/validateRequest';
import renderTemplate from '../services/renderTemplate';
import errors from '../errors';
import { tables } from '../../db/structure';

type GetTemplateRenderedRequestParams = {
    name: string
};

const validateRequestBeforeGetTemplateRendered = validateRequestFactory([{
    schema: Joi.object({
        name: templateNameSchema.required(),
    }),
    selector: 'params',
}]);

async function getRenderedTemplate(req: Request<GetTemplateRenderedRequestParams>, res: Response): Promise<void> {
    const {
        name: templateName,
    } = req.params;

    const { locale } = req.query;

    const [defaultTemplate] = await db.select().from<Template>('templates').where('name', templateName);

    if (!defaultTemplate) {
        res.status(404).send('Not found');
        return;
    }

    let content = defaultTemplate.content;
    if (locale) {
        const [localizedTemplate] = await db.select()
            .from<LocalizedTemplate>(tables.templatesLocalized)
            .where('templateName', templateName)
            .andWhere('locale', locale as string);
        if (localizedTemplate) {
            content = localizedTemplate.content;
        }
    }

    try {
        const renderedTemplate = await renderTemplate(content);
        res.status(200).send(_.assign(defaultTemplate, renderedTemplate));
    } catch (e) {
        if (e instanceof errors.FetchIncludeError) {
            res.status(503).send(e.message);
            noticeError(e, {
                context: 'Error during fetch of the rendered template',
            });
            return;
        } else {
            throw e;
        }
    }
}

export default [validateRequestBeforeGetTemplateRendered, getRenderedTemplate];
