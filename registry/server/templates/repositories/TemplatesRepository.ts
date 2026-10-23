import { Knex } from 'knex';

import { Tables } from '../../db/structure';
import { normalizeArray } from '../../util/normalizeArray';
import { EntityTypes, VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { LocalizedTemplateRow, LocalizedVersion, TemplateRow, TemplatesFilters } from '../interfaces';

import Transaction = Knex.Transaction;

export class TemplatesRepository {
    constructor(
        private readonly db: Knex,
        private readonly versioning: Versioning,
    ) {}

    async list(filters: TemplatesFilters): Promise<VersionedRecord<TemplateRow>[]> {
        const query = this.selectVersioned().orderBy('name', 'asc');

        this.addFilterByName(query, filters);
        this.addFilterByDomainId(query, filters);

        return query;
    }

    async findByName(templateName: string): Promise<VersionedRecord<TemplateRow> | undefined> {
        const [template] = await this.selectVersioned().where('name', templateName);
        return template;
    }

    async findByNameForDomain(
        templateName: string,
        domainId: number,
    ): Promise<VersionedRecord<TemplateRow> | undefined> {
        const [template] = await this.selectVersioned()
            .join(Tables.Routes, `${Tables.Templates}.name`, `${Tables.Routes}.templateName`)
            .where({ domainId, name: templateName });
        return template;
    }

    async findLocalizedVersions(templateName: string): Promise<LocalizedTemplateRow[]> {
        return this.db(Tables.TemplatesLocalized).where('templateName', templateName);
    }

    async findLocalizedVersion(templateName: string, locale: string): Promise<LocalizedTemplateRow | undefined> {
        const [localizedTemplate] = await this.db(Tables.TemplatesLocalized).where({ templateName, locale });
        return localizedTemplate;
    }

    async insert(template: TemplateRow, trx: Transaction): Promise<void> {
        await trx(Tables.Templates).insert(template);
    }

    async updateContent(templateName: string, content: string | undefined, trx: Transaction): Promise<number> {
        return trx(Tables.Templates).where({ name: templateName }).update({ content });
    }

    async delete(templateName: string, trx: Transaction): Promise<number> {
        return trx(Tables.Templates).where('name', templateName).delete();
    }

    /** Makes the template's localized versions exactly the given ones */
    async replaceLocalizedVersions(
        templateName: string,
        localizedVersions: Record<string, LocalizedVersion>,
        trx: Transaction,
    ): Promise<void> {
        const locales = Object.keys(localizedVersions);
        const existingLocaleVersions = await trx(Tables.TemplatesLocalized).where({ templateName });
        const existingLocales = existingLocaleVersions.map((l) => l.locale);

        for (const locale of existingLocales) {
            await trx(Tables.TemplatesLocalized)
                .where({ templateName, locale })
                .update({ ...localizedVersions[locale], locale, templateName });
        }

        const newLocales = locales.filter((l) => !existingLocales.includes(l));
        for (const locale of newLocales) {
            await trx(Tables.TemplatesLocalized).insert({ ...localizedVersions[locale], locale, templateName });
        }

        const deletedLocales = existingLocales.filter((l) => !locales.includes(l));
        for (const locale of deletedLocales) {
            await trx(Tables.TemplatesLocalized).where({ templateName, locale }).delete();
        }
    }

    /** @returns false when there is no such template */
    async upsertLocalizedVersion(templateName: string, locale: string, content: string): Promise<boolean> {
        return this.db.transaction(async (trx) => {
            const existingTemplate = await trx(Tables.Templates).where({ name: templateName }).first('name');
            if (!existingTemplate) {
                return false;
            }

            const existingRecord = await trx(Tables.TemplatesLocalized).where({ templateName, locale }).first('locale');

            if (existingRecord) {
                await trx(Tables.TemplatesLocalized).update({ content }).where({ templateName, locale });
            } else {
                await trx(Tables.TemplatesLocalized).insert({ templateName, locale, content });
            }

            return true;
        });
    }

    async deleteLocalizedVersion(templateName: string, locale: string): Promise<number> {
        return this.db(Tables.TemplatesLocalized).where({ templateName, locale }).delete();
    }

    private selectVersioned() {
        return this.versioning.versionedSelect(Tables.Templates, 'name', EntityTypes.templates, [
            `${Tables.Templates}.*`,
        ]);
    }

    private addFilterByName(query: Knex.QueryBuilder, filters: TemplatesFilters) {
        if (!filters.name && !filters.id) {
            return;
        }
        const name = normalizeArray(filters.name);
        const id = normalizeArray(filters.id);
        query.whereIn('name', [...(id ?? name ?? [])]);
    }

    private addFilterByDomainId(query: Knex.QueryBuilder, filters: TemplatesFilters) {
        const { db } = this;

        if (!filters.domainId) {
            return;
        }
        if (filters.domainId === 'null') {
            query
                .whereNotExists(function () {
                    this.select(1)
                        .from(Tables.Routes)
                        .where(`${Tables.Routes}.templateName`, db.ref(`${Tables.Templates}.name`))
                        .whereNotNull(`${Tables.Routes}.domainId`);
                })
                .whereNotExists(function () {
                    this.select(1)
                        .from(Tables.RouterDomains)
                        .where(`${Tables.RouterDomains}.template500`, db.ref(`${Tables.Templates}.name`));
                });
        } else {
            query
                .distinct()
                .leftJoin(Tables.Routes, `${Tables.Routes}.templateName`, `${Tables.Templates}.name`)
                .leftJoin(Tables.RouterDomains, `${Tables.RouterDomains}.template500`, `${Tables.Templates}.name`)
                .where(`${Tables.Routes}.domainId`, filters.domainId)
                .orWhere(`${Tables.RouterDomains}.id`, filters.domainId);
        }
    }
}
