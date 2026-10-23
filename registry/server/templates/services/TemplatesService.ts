import type { User } from '../../../typings/User';
import { NotFoundError, UnprocessableContent } from '../../errorHandler/httpErrors';
import type { RouterDomainsRepository } from '../../routerDomains/repositories/RouterDomainsRepository';
import { SettingKeys } from '../../settings/interfaces';
import type { SettingsService } from '../../settings/services/SettingsService';
import { getLogger } from '../../util/logger';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import errors from '../errors';
import type {
    CreateTemplateInput,
    LocalizedVersion,
    TemplateRow,
    TemplatesFilters,
    TemplateWithLocalizedVersions,
    UpdateTemplateInput,
} from '../interfaces';
import type { TemplatesRepository } from '../repositories/TemplatesRepository';
import renderTemplate from './renderTemplate';

export class TemplatesService {
    constructor(
        private readonly repository: TemplatesRepository,
        private readonly routerDomainsRepository: RouterDomainsRepository,
        private readonly versioning: Versioning,
        private readonly settings: Pick<SettingsService, 'get'>,
    ) {}

    list(filters: TemplatesFilters): Promise<VersionedRecord<TemplateRow>[]> {
        return this.repository.list(filters);
    }

    async get(templateName: string): Promise<VersionedRecord<TemplateWithLocalizedVersions> | undefined> {
        const template = await this.repository.findByName(templateName);
        if (!template) {
            return undefined;
        }

        const localizedTemplates = await this.repository.findLocalizedVersions(templateName);
        const localizedVersions = Object.fromEntries(
            localizedTemplates.map((item) => [item.locale, { content: item.content }]),
        );

        return { ...template, localizedVersions };
    }

    async create(
        template: CreateTemplateInput,
        user: User | undefined,
    ): Promise<VersionedRecord<TemplateWithLocalizedVersions>> {
        const localizedVersions = template.localizedVersions ?? {};
        await this.assertRenderable(template.content, localizedVersions);
        await this.assertSupportedLocales(Object.keys(localizedVersions));

        await this.versioning.withVersion(user, { type: EntityTypes.templates, id: template.name }, async (trx) => {
            await this.repository.insert({ name: template.name, content: template.content }, trx);
            if (Object.keys(localizedVersions).length > 0) {
                await this.repository.replaceLocalizedVersions(template.name, localizedVersions, trx);
            }
        });

        return this.getOrFail(template.name);
    }

    async update(
        templateName: string,
        template: UpdateTemplateInput,
        user: User | undefined,
    ): Promise<VersionedRecord<TemplateWithLocalizedVersions>> {
        const localizedVersions = template.localizedVersions ?? {};
        await this.assertRenderable(template.content, localizedVersions);
        await this.assertSupportedLocales(Object.keys(localizedVersions));

        await this.versioning.withVersion(user, { type: EntityTypes.templates, id: templateName }, async (trx) => {
            const count = await this.repository.updateContent(templateName, template.content, trx);
            if (!count) {
                throw new NotFoundError();
            }
            await this.repository.replaceLocalizedVersions(templateName, localizedVersions, trx);
        });

        return this.getOrFail(templateName);
    }

    async updateContent(
        templateName: string,
        content: string,
        user: User | undefined,
    ): Promise<VersionedRecord<TemplateRow>> {
        await this.assertRenderable(content, {});

        await this.versioning.withVersion(user, { type: EntityTypes.templates, id: templateName }, async (trx) => {
            const count = await this.repository.updateContent(templateName, content, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });

        const template = await this.repository.findByName(templateName);
        if (!template) {
            throw new errors.TemplateNotFoundError({ data: { templateName } });
        }
        return template;
    }

    async delete(templateName: string, user: User | undefined): Promise<void> {
        await this.versioning.withVersion(user, { type: EntityTypes.templates, id: templateName }, async (trx) => {
            const count = await this.repository.delete(templateName, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }

    async upsertLocalizedVersion(
        templateName: string,
        locale: string,
        localizedVersion: LocalizedVersion,
    ): Promise<LocalizedVersion> {
        await this.assertRenderable(localizedVersion.content, {});
        await this.assertSupportedLocales([locale]);

        const upserted = await this.repository.upsertLocalizedVersion(templateName, locale, localizedVersion.content);
        if (!upserted) {
            throw new NotFoundError();
        }
        return localizedVersion;
    }

    async deleteLocalizedVersion(templateName: string, locale: string): Promise<void> {
        const count = await this.repository.deleteLocalizedVersion(templateName, locale);
        if (!count) {
            throw new NotFoundError();
        }
    }

    /**
     * The template attached to the domain's routes, otherwise the one with that name,
     * with the content of the localized version when there is one for the locale
     */
    async getForRendering(
        templateName: string,
        { domain, locale }: { domain?: string; locale?: string },
    ): Promise<{ template: VersionedRecord<TemplateRow>; content: string } | undefined> {
        let template: VersionedRecord<TemplateRow> | undefined;

        if (domain) {
            const domainId = await this.routerDomainsRepository.findIdByDomainName(domain);
            if (domainId !== undefined) {
                template = await this.repository.findByNameForDomain(templateName, domainId);
            }
        }

        if (!template) {
            template = await this.repository.findByName(templateName);
            if (template) {
                getLogger().info(`Template ${templateName} is not attached to the domain, found by template name.`);
            }
        }

        if (!template) {
            return undefined;
        }

        const localizedTemplate = locale ? await this.repository.findLocalizedVersion(templateName, locale) : undefined;

        // templates.content is nullable in the schema, though the API always sets it
        return { template, content: localizedTemplate ? localizedTemplate.content : (template.content ?? '') };
    }

    /** Request headers to pass on when fetching the template's includes */
    async getProxyHeaderNames(): Promise<string[] | null> {
        return (await this.settings.get<string[]>(SettingKeys.TemplateProxyHeaders)) ?? null;
    }

    private async getOrFail(templateName: string): Promise<VersionedRecord<TemplateWithLocalizedVersions>> {
        const template = await this.get(templateName);
        if (!template) {
            throw new errors.TemplateNotFoundError({ data: { templateName } });
        }
        return template;
    }

    /** The content and every localized content must render, includes are fetched for that */
    private async assertRenderable(
        content: string | undefined,
        localizedVersions: Record<string, LocalizedVersion>,
    ): Promise<void> {
        const contents = [content, ...Object.values(localizedVersions).map((version) => version.content)];

        for (const value of contents) {
            if (value === undefined) {
                continue;
            }
            try {
                await renderTemplate(value);
            } catch (e: unknown) {
                throw new UnprocessableContent({ message: e instanceof Error ? e.message : String(e) });
            }
        }
    }

    private async assertSupportedLocales(locales: string[]): Promise<void> {
        if (locales.length === 0) {
            return;
        }

        const supportedLocales = await this.settings.get<string[]>(SettingKeys.I18nSupportedLocales);
        if (supportedLocales === undefined) {
            throw new Error(`Setting ${SettingKeys.I18nSupportedLocales} is not set`);
        }

        const unsupportedLocales = locales.filter((l) => !supportedLocales.includes(l));
        if (unsupportedLocales.length > 0) {
            throw new UnprocessableContent({
                message: `Next locales are not supported ${unsupportedLocales.join(',')}. Either change request or change ${
                    SettingKeys.I18nSupportedLocales
                } setting.`,
            });
        }
    }
}
