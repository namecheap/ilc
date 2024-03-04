import { Request, Response } from 'express';
import Joi from 'joi';
import _, { LodashStubString } from 'lodash/fp';

import noticeError from '../../errorHandler/noticeError';
import db from '../../db';
import Template, { LocalizedTemplate } from '../interfaces';
import validateRequestFactory from '../../common/services/validateRequest';
import renderTemplate from '../services/renderTemplate';
import errors from '../errors';
import { Tables } from '../../db/structure';
import { templateNameSchema } from './validation';
import RouterDomains from '../../routerDomains/interfaces';
import { getLogger } from '../../util/logger';
import { appendDigest } from '../../util/hmac';

type GetTemplateRenderedRequestParams = {
    name: string;
};

const validateRequestBeforeGetTemplateRendered = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
        }),
        selector: 'params',
    },
]);

async function getTemplateByDomain(domain: string, templateName: string): Promise<Template | null> {
    const [domainItem] = await db
        .select('id')
        .from<RouterDomains>('router_domains')
        .where('domainName', String(domain));

    if (!domainItem) {
        return null;
    }

    const [template] = await db
        .select('versioning.id as versionId', ', templates.*')
        .from<Template>('templates')
        .join('routes', 'templates.name', 'routes.templateName')
        .leftOuterJoin('versioning', function () {
            this.on('versioning.entity_id', '=', 'templates.name');
        })
        .where({
            domainId: domainItem.id,
            name: templateName
        })
        .andWhere(function () {
            this.orWhere('versioning.entity_type', 'templates')
                .orWhere('versioning.entity_type', null);
        })
        .orderBy('versioning.id', 'desc')
        .limit(1);

    if (template) {
        template.versionId = appendDigest(template.versionId, 'template');
    }

    return template;
}

async function getTemplateByName(templateName: string): Promise<Template | undefined> {
    const [template] = await db
        .select('versioning.id as versionId', 'templates.*')
        .from<Template>('templates')
        .leftOuterJoin('versioning', function () {
            this.on('versioning.entity_id', '=', 'templates.name');
        })
        .where('templates.name', templateName)
        .andWhere(function () {
            this.orWhere('versioning.entity_type', 'templates')
                .orWhere('versioning.entity_type', null);
        })
        .orderBy('versioning.id', 'desc')
        .limit(1);

    if (template) {
        template.versionId = appendDigest(template.versionId, 'template');
    }

    return template;
}

async function getRenderedTemplate(req: Request<GetTemplateRenderedRequestParams>, res: Response): Promise<void> {
    let template;

    const { name: templateName } = req.params;

    const { locale, domain } = req.query;

    if (domain) {
        template = await getTemplateByDomain(String(domain), templateName);
    }

    if (!template) {
        template = await getTemplateByName(templateName);
        template && getLogger().info(`Template ${templateName} is not attached to the domain, found by template name.`);
    }

    if (!template) {
        res.status(404).send('Not found');
        return;
    }

    let content = template.content;
    if (locale) {
        const [localizedTemplate] = await db
            .select()
            .from<LocalizedTemplate>(Tables.TemplatesLocalized)
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
            res.status(500).send(e.message);
            noticeError(e, {
                context: 'Error during fetch of the rendered template',
            });
            return;
        } else {
            console.error(`Error on render template "${templateName}"`, e);
            throw e;
        }
    }
}

export default [validateRequestBeforeGetTemplateRendered, getRenderedTemplate];
