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

type GetTemplateRenderedRequestParams = {
    name: string;
};

interface DomainTemplateResult {
    template: Template | null;
    brandId?: string;
}

interface DomainProps {
    brandId?: string;
    [key: string]: unknown;
}

const validateRequestBeforeGetTemplateRendered = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
        }),
        selector: 'params',
    },
]);

function parseDomainProps(props: RouterDomains['props']): DomainProps {
    if (!props) {
        return {};
    }
    if (typeof props === 'string') {
        return JSON.parse(props) as DomainProps;
    }
    return props;
}

async function getTemplateByDomain(domain: string, templateName: string): Promise<DomainTemplateResult | null> {
    const [domainItem] = await db
        .select('id', 'props')
        .from<RouterDomains>('router_domains')
        .where('domainName', String(domain));

    if (!domainItem) {
        return null;
    }

    const [template] = await db
        .selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.*`])
        .join('routes', 'templates.name', 'routes.templateName')
        .where({
            domainId: domainItem.id,
            name: templateName,
        });

    const props = parseDomainProps(domainItem.props);

    if (!template) {
        return { template: null, brandId: props.brandId };
    }

    template.versionId = appendDigest(template.versionId, 'template');

    return { template, brandId: props.brandId };
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
        const result = await getTemplateByDomain(domain, templateName);
        if (result) {
            template = result.template ?? undefined;
            brandId = result.brandId;
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
