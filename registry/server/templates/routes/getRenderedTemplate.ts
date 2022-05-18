import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _, { LodashStubString } from 'lodash/fp';

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

async function getTemplateByDomain(domain: string, templateName: string): Promise<Template | undefined> {
    const [domainItem] = await db.select('id').from<RouterDomains>('router_domains').where('domainName', String(domain));

    const [template] = await db.select('templates.*').from<Template>('templates')
                .join('routes', 'templates.name', 'routes.templateName')
                .where({
                    domainId: domainItem.id,
                    name: templateName,
                });

    return template;
}

async function getTemplateByName(templateName: string): Promise<Template | undefined> {
    const [template] = await db.select().from<Template>('templates').where('name', templateName);
    return template;
}

async function getRenderedTemplate(req: Request<GetTemplateRenderedRequestParams>, res: Response): Promise<void> {
    let template;

    const {
        name: templateName,
    } = req.params;

    const { locale, domain } = req.query;

    if (domain) {
        template = await getTemplateByDomain(String(domain), templateName);
    }

    if (!template) {
        template = await getTemplateByName(templateName);
        template && console.info(`Template ${templateName} is not attached to the domain, found by template name.`);
    }

    if (!template) {
        res.status(404).send('Not found');
        return;
    }

    let content = template.content;
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
        res.status(200).send(_.assign(template, renderedTemplate));
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
