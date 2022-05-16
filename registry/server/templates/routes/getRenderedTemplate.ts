import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import noticeError from '../../errorHandler/noticeError';
import db from '../../db';
import Template, {
    LocalizedTemplate
} from '../interfaces';
import validateRequestFactory from '../../common/services/validateRequest';
import renderTemplate from '../services/renderTemplate';
import errors from '../errors';
import { tables } from '../../db/structure';
import { templateNameSchema } from './validation';
import RouterDomains from '../../routerDomains/interfaces';

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
    let defaultTemplate;

    const {
        name: templateName,
    } = req.params;

    const { locale, domain } = req.query;

    if (domain) {
        const [domainItem] = await db.select('id').from<RouterDomains>('router_domains').where('domainName', String(domain));

        if (domainItem) {
            [defaultTemplate] = await db.select('templates.*').from<Template>('templates')
                .join('routes', 'templates.name', 'routes.templateName')
                .where({
                    domainId: domainItem.id,
                    name: templateName,
                });
        }
    }

    if (!defaultTemplate) {
        [defaultTemplate] = await db.select().from<Template>('templates').where('name', templateName);
    }

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
