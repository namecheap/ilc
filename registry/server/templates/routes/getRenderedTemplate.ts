import { Request, Response } from 'express';
import Joi from 'joi';

import noticeError from '../../errorHandler/noticeError';
import db from '../../db';
import Template, { LocalizedTemplateRow } from '../interfaces';
import validateRequestFactory from '../../common/services/validateRequest';
import renderTemplate from '../services/renderTemplate';
import errors from '../errors';
import { Tables } from '../../db/structure';
import { EntityTypes } from '../../versioning/interfaces';
import { templateNameSchema } from './validation';
import RouterDomains from '../../routerDomains/interfaces';
import { getLogger } from '../../util/logger';
import { appendDigest } from '../../util/hmac';
import { JSONValue, parseJSON } from '../../common/services/json';

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

async function getDomainByName(domain: string): Promise<RouterDomains | undefined> {
    const [domainItem] = await db
        .select('id', 'props')
        .from<RouterDomains>('router_domains')
        .where('domainName', String(domain));

    return domainItem;
}

async function getTemplateByDomainId(domainId: number, templateName: string): Promise<Template | undefined> {
    const [template] = await db
        .selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.*`])
        .join('routes', 'templates.name', 'routes.templateName')
        .where({
            domainId,
            name: templateName,
        });

    if (template) {
        template.versionId = appendDigest(template.versionId, 'template');
    }

    return template;
}

async function getTemplateByName(templateName: string): Promise<Template | undefined> {
    const [template] = await db
        .selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.*`])
        .where('name', templateName);

    if (template) {
        template.versionId = appendDigest(template.versionId, 'template');
    }

    return template;
}

async function getRenderedTemplate(req: Request<GetTemplateRenderedRequestParams>, res: Response): Promise<void> {
    let template: Template | undefined;
    let brandId: string | undefined;

    const { name: templateName } = req.params;
    const locale = req.query.locale as string;
    const domain = req.query.domain as string;

    if (domain) {
        const domainItem = await getDomainByName(domain);
        if (domainItem) {
            const domainProps = domainItem.props ? parseJSON<Record<string, JSONValue>>(domainItem.props) : null;
            brandId = typeof domainProps?.brandId === 'string' ? domainProps.brandId : undefined;
            template = await getTemplateByDomainId(domainItem.id, templateName);
        }
    }

    if (!template) {
        template = await getTemplateByName(templateName);
        if (template) {
            getLogger().info(`Template ${templateName} is not attached to the domain, found by template name.`);
        }
    }

    if (!template) {
        res.status(404).send('Not found');
        return;
    }

    let content = template.content;
    if (locale) {
        const [localizedTemplate] = await db
            .select()
            .from<LocalizedTemplateRow>(Tables.TemplatesLocalized)
            .where('templateName', templateName)
            .andWhere('locale', locale);

        if (localizedTemplate) {
            content = localizedTemplate.content;
        }
    }

    try {
        const renderedTemplate = await renderTemplate(content, brandId ? { brandId } : undefined);
        res.status(200).send({ ...template, ...renderedTemplate });
    } catch (e) {
        if (e instanceof errors.FetchIncludeError) {
            res.status(500).send(e.message);
            noticeError(e, {
                context: 'Error during fetch of the rendered template',
            });
            return;
        } else {
            getLogger().error(e as Error, `Error on render template "${templateName}"`);
            throw e;
        }
    }
}

export default [validateRequestBeforeGetTemplateRendered, getRenderedTemplate];
