import { Knex } from 'knex';

import { PaginatedResult } from '../../../typings/PaginatedResult';
import { User } from '../../../typings/User';
import db, { VersionedKnex } from '../../db';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { normalizeArray } from '../../util/normalizeArray';
import { EntityTypes, VersionedRecord } from '../../versioning/interfaces';
import errors from '../errors';
import Template, {
    CreateTemplatePayload,
    LocalizedTemplateRow,
    LocalizedVersion,
    TemplateWithLocalizedVersions,
    UpdateTemplatePayload,
} from '../interfaces';

import Transaction = Knex.Transaction;

export interface TemplatesGetListFilters {
    domainId?: number | 'null';
    id?: string[] | string;
    name?: string[] | string;
}

interface UpdateTemplateResultOk {
    type: 'ok';
    template: VersionedRecord<TemplateWithLocalizedVersions>;
}

interface UpdateTemplateResultNotFound {
    type: 'notFound';
}

type UpdateTemplateResult = UpdateTemplateResultOk | UpdateTemplateResultNotFound;

interface UpsertTemplateLocalizedVersionResultOk {
    type: 'ok';
    localizedVersion: LocalizedVersion;
}

interface UpsertTemplateLocalizedVersionResultNotFound {
    type: 'notFound';
}

type UpsertTemplateLocalizedVersionResult =
    | UpsertTemplateLocalizedVersionResultOk
    | UpsertTemplateLocalizedVersionResultNotFound;

interface DeleteTemplateLocalizedVersionResultOk {
    type: 'ok';
}

interface DeleteTemplateLocalizedVersionResultNotFound {
    type: 'notFound';
}

type DeleteTemplateLocalizedVersionResult =
    | DeleteTemplateLocalizedVersionResultOk
    | DeleteTemplateLocalizedVersionResultNotFound;

export class TemplatesRepository {
    constructor(private db: VersionedKnex) {}

    async getList(filters: TemplatesGetListFilters): Promise<PaginatedResult<Template>> {
        const { db } = this;

        const query = db
            .selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [
                `${Tables.Templates}.*`,
            ])
            .orderBy('name', 'asc');

        this.addFilterByName(query, filters);
        this.addFilterByDomainId(query, filters);

        const templates = await query;

        const itemsWithId = templates.map((item) => {
            return { ...item, versionId: appendDigest(item.versionId, 'template') };
        });

        return {
            data: itemsWithId,
            pagination: {
                //Stub for future pagination capabilities
                total: templates.length,
            },
        };
    }

    async readTemplateWithAllVersions(
        templateName: string,
    ): Promise<VersionedRecord<TemplateWithLocalizedVersions> | undefined> {
        const { db } = this;

        const [template] = await db
            .selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [
                `${Tables.Templates}.*`,
            ])
            .where('name', templateName);

        if (!template) {
            return undefined;
        }

        template.versionId = appendDigest(template.versionId, 'template');

        const localizedTemplates: LocalizedTemplateRow[] = await db
            .select()
            .from<LocalizedTemplateRow>(Tables.TemplatesLocalized)
            .where('templateName', templateName);

        const localizedVersions = localizedTemplates.reduce(
            (acc, item) => {
                acc[item.locale] = { content: item.content };
                return acc;
            },
            {} as Record<string, LocalizedVersion>,
        );

        return { ...template, localizedVersions };
    }

    async createTemplate(
        template: CreateTemplatePayload,
        user: User | undefined,
    ): Promise<VersionedRecord<TemplateWithLocalizedVersions>> {
        const { db } = this;
        const templateToCreate = {
            name: template.name,
            content: template.content,
        };

        const localizedVersions = template.localizedVersions ?? {};

        await db.versioning(user, { type: EntityTypes.templates, id: template.name }, async (trx) => {
            await db(Tables.Templates).insert(templateToCreate).transacting(trx);
            if (Object.keys(localizedVersions).length > 0) {
                await this.upsertLocalizedVersions(template.name, localizedVersions, trx);
            }
        });

        const savedTemplate = await this.mustReadTemplateWithAllVersions(template.name);

        return savedTemplate;
    }

    async updateTemplate(
        templateName: string,
        payload: UpdateTemplatePayload,
        user: User | undefined,
    ): Promise<UpdateTemplateResult> {
        const { db } = this;

        const templatesToUpdate = await db(Tables.Templates).where({
            name: templateName,
        });
        if (!templatesToUpdate.length) {
            return { type: 'notFound' };
        }
        const localizedVersions = payload.localizedVersions ?? {};

        await db.versioning(
            user,
            {
                type: EntityTypes.templates,
                id: templateName,
            },
            async (trx) => {
                await db(Tables.Templates)
                    .where({ name: templateName })
                    .update({ content: payload.content })
                    .transacting(trx);
                await this.upsertLocalizedVersions(templateName, localizedVersions, trx);
            },
        );

        const updatedTemplate = await this.mustReadTemplateWithAllVersions(templateName);

        return { type: 'ok', template: updatedTemplate };
    }

    async upsertLocalizedVersion(
        templateName: string,
        locale: string,
        localizedVersion: LocalizedVersion,
    ): Promise<UpsertTemplateLocalizedVersionResult> {
        const { db } = this;

        const result = await db.transaction(async (trx): Promise<UpsertTemplateLocalizedVersionResult> => {
            const existingTemplate = await trx(Tables.Templates).where({ name: templateName }).select(1).first();
            if (!existingTemplate) {
                return { type: 'notFound' };
            }

            const existingRecord = await trx(Tables.TemplatesLocalized)
                .where({ templateName, locale })
                .select(1)
                .first();

            if (existingRecord) {
                await trx(Tables.TemplatesLocalized)
                    .update({ content: localizedVersion.content })
                    .where({ templateName, locale });
            } else {
                await trx(Tables.TemplatesLocalized).insert({
                    templateName,
                    locale,
                    content: localizedVersion.content,
                });
            }

            return { type: 'ok', localizedVersion } as const;
        });

        return result;
    }

    async deleteLocalizedVersion(templateName: string, locale: string): Promise<DeleteTemplateLocalizedVersionResult> {
        const { db } = this;
        const result = await db(Tables.TemplatesLocalized).where({ templateName, locale }).delete();
        if (result === 0) {
            return { type: 'notFound' };
        }
        return { type: 'ok' };
    }

    private async mustReadTemplateWithAllVersions(
        templateName: string,
    ): Promise<VersionedRecord<TemplateWithLocalizedVersions>> {
        const maybeTemplate = await this.readTemplateWithAllVersions(templateName);
        if (!maybeTemplate) {
            throw new errors.TemplateNotFoundError({ data: { templateName } });
        }
        return maybeTemplate;
    }

    private async upsertLocalizedVersions(
        templateName: string,
        localizedVersions: Record<string, LocalizedVersion>,
        trx: Transaction,
    ): Promise<void> {
        const { db } = this;

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

    private addFilterByName(query: Knex.QueryBuilder, filters: TemplatesGetListFilters) {
        if (!filters.name && !filters.id) {
            return;
        }
        const name = normalizeArray(filters.name);
        const id = normalizeArray(filters.id);
        query.whereIn('name', [...(id ?? name ?? [])]);
    }

    private addFilterByDomainId(query: Knex.QueryBuilder, filters: TemplatesGetListFilters) {
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

export const templatesRepository = new TemplatesRepository(db);
