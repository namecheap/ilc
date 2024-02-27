import db from '../../db';
import Template, { LocalizedTemplate } from '../interfaces';
import { Tables } from '../../db/structure';
import { Knex } from 'knex';
import Transaction = Knex.Transaction;
import { appendDigest } from '../../util/hmac';

export async function readTemplateWithAllVersions(templateName: string) {
    const [template] = await db
        .select(`${Tables.Versioning}.id as versionId`, `${Tables.Templates}.*`)
        .from<Template>(Tables.Templates)
        .leftOuterJoin(Tables.Versioning, function () {
            this.on(`${Tables.Versioning}.entity_id`, '=', `${Tables.Templates}.name`);
        })
        .where('name', templateName)
        .andWhere(function () {
            this.orWhere(`${Tables.Versioning}.entity_type`, 'templates')
                .orWhere(`${Tables.Versioning}.entity_type`, null);
        })
        .orderBy(`${Tables.Versioning}.id`, 'desc')
        .limit(1);

    if (!template) {
        return undefined;
    }

    template.versionId = appendDigest(template.versionId, 'template');

    const localizedTemplates: LocalizedTemplate[] = await db
        .select()
        .from<LocalizedTemplate>(Tables.TemplatesLocalized)
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
    const existingLocaleVersions = await db(Tables.TemplatesLocalized)
        .where((builder) => builder.where({ templateName: templateName }))
        .transacting(trx);
    const existingLocales = existingLocaleVersions.map((l) => l.locale);
    for (let v in existingLocaleVersions) {
        const locale = existingLocaleVersions[v].locale;
        await db(Tables.TemplatesLocalized)
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
        await db(Tables.TemplatesLocalized)
            .insert({ ...localizedVersions[locale], locale, templateName })
            .transacting(trx);
    }

    const deletedLocales = existingLocales.filter((l) => !locales.includes(l));
    for (let i in deletedLocales) {
        let locale = deletedLocales[i];
        await db(Tables.TemplatesLocalized).where({ templateName, locale }).delete().transacting(trx);
    }
}
