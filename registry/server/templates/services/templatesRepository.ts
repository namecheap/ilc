import db from '../../db';
import Template, { LocalizedTemplate } from '../interfaces';
import { tables } from '../../db/structure';
import { Knex } from 'knex';
import Transaction = Knex.Transaction;
import { appendDigest } from '../../util/hmac';

export async function readTemplateWithAllVersions(templateName: string) {
    const [template] = await db
        .select(`${tables.versioning}.id as versionId`, `${tables.templates}.*`)
        .from<Template>(tables.templates)
        .leftOuterJoin(tables.versioning, function () {
            this.on(`${tables.versioning}.entity_id`, '=', `${tables.templates}.name`);
        })
        .where('name', templateName)
        .andWhere(function () {
            this.orWhere(`${tables.versioning}.entity_type`, 'templates')
                .orWhere(`${tables.versioning}.entity_type`, null);
        })
        .orderBy(`${tables.versioning}.id`, 'desc')
        .limit(1);

    if (!template) {
        return undefined;
    }

    template.versionId = appendDigest(template.versionId, 'template');

    const localizedTemplates: LocalizedTemplate[] = await db
        .select()
        .from<LocalizedTemplate>(tables.templatesLocalized)
        .where('templateName', templateName);
    template.localizedVersions = localizedTemplates.reduce(
        (acc, item) => {
            acc[item.locale] = { content: item.content };
            return acc;
        },
        {} as Record<string, object>,
    );

    return template;
}

export async function upsertLocalizedVersions(templateName: string, localizedVersions: any, trx: Transaction) {
    const locales = Object.keys(localizedVersions);
    const existingLocaleVersions = await db(tables.templatesLocalized)
        .where((builder) => builder.where({ templateName: templateName }))
        .transacting(trx);
    const existingLocales = existingLocaleVersions.map((l) => l.locale);
    for (let v in existingLocaleVersions) {
        const locale = existingLocaleVersions[v].locale;
        await db(tables.templatesLocalized)
            .where({
                templateName,
                locale: locale,
            })
            .update({ ...localizedVersions[locale], locale, templateName })
            .transacting(trx);
    }

    const newLocales = locales.filter((l) => !existingLocales.includes(l));
    for (let v in newLocales) {
        let locale = newLocales[v];
        await db(tables.templatesLocalized)
            .insert({ ...localizedVersions[locale], locale, templateName })
            .transacting(trx);
    }

    const deletedLocales = existingLocales.filter((l) => !locales.includes(l));
    for (let i in deletedLocales) {
        let locale = deletedLocales[i];
        await db(tables.templatesLocalized).where({ templateName, locale }).delete().transacting(trx);
    }
}
