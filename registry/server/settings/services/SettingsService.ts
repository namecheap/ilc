import config from 'config';
import { User } from '../../../typings/User';
import { JSONValue, isNumeric, safeParseJSON } from '../../util/json';
import { NotFoundError, UnprocessableContent } from '../../errorHandler/httpErrors';
import type { RouterDomainsRepository } from '../../routerDomains/repositories/RouterDomainsRepository';
import { defined } from '../../util/defined';
import { set } from '../../util/set';
import { EntityTypes } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import {
    AllowedSettingKeysForDomains,
    DomainSettingRow,
    Scope,
    SettingKeys,
    SettingParsed,
    SettingRaw,
    SettingTypes,
    SettingValue,
} from '../interfaces';
import type { SettingsRepository } from '../repositories/SettingsRepository';

type GetOptions = {
    range?: string;
    ilc?: boolean;
    allowedForDomains: boolean | null;
};

export class SettingsService {
    private changesTracking: any = {};

    private protectedSettings = config.get<string>('protectedSettings').split(',');

    //TODO: implement cache
    //private cache: any = {};

    constructor(
        private readonly repository: SettingsRepository,
        private readonly routerDomainsRepository: RouterDomainsRepository,
        private readonly versioning: Versioning,
    ) {}

    async get<T extends SettingValue = SettingValue>(
        key: SettingKeys,
        callerId: string | null = null,
    ): Promise<T | undefined> {
        const value = await this.getValue(key);

        if (callerId) {
            if (this.changesTracking[callerId] === undefined) {
                this.changesTracking[callerId] = {};
            }

            this.changesTracking[callerId][key] = value;
        }

        return value as T | undefined;
    }

    async hasChanged(callerId: string, keys: SettingKeys[]): Promise<boolean> {
        for (let key of keys) {
            const val = await this.getValue(key);

            if (!this.changesTracking[callerId] || val !== this.changesTracking[callerId][key]) {
                return true;
            }
        }

        return false;
    }

    async set(settingKey: SettingKeys, value: unknown, user: User | undefined) {
        await this.versioning.withVersion(user, { type: EntityTypes.settings, id: settingKey }, (trx) =>
            this.repository.updateValue(settingKey, JSON.stringify(value), trx),
        );
    }

    private async getValue(key: SettingKeys): Promise<SettingValue | undefined> {
        const setting = await this.repository.findByKey(key);

        if (setting === undefined) {
            return;
        }

        // Both columns are nullable, a NULL reads as null as JSON.parse(null) did
        const value = setting.value === null ? null : JSON.parse(setting.value);

        if (value !== '') {
            return value;
        }

        const defaultValue = setting.default === null ? null : JSON.parse(setting.default);

        if (defaultValue !== '') {
            return defaultValue;
        }
    }

    async updateRootSetting(
        settingKey: SettingKeys,
        value: unknown,
        user: User | undefined,
    ): Promise<SettingRaw | undefined> {
        await this.versioning.withVersion(user, { type: EntityTypes.settings, id: settingKey }, (trx) =>
            this.repository.updateValue(settingKey, JSON.stringify(value), trx),
        );

        return this.repository.findByKey(settingKey);
    }

    async updateDomainSetting(
        settingKey: SettingKeys,
        value: unknown,
        domainId: number,
        user: User | undefined,
    ): Promise<DomainSettingRow | undefined> {
        const setting = await this.repository.findDomainValue(settingKey, domainId);
        if (!setting) {
            return await this.createSettingForDomain(settingKey, value, domainId, user);
        }

        await this.versioning.withVersion(user, { type: EntityTypes.settings_domain_value, id: setting.id }, (trx) =>
            this.repository.updateDomainValue(setting.id, JSON.stringify(value), trx),
        );

        return this.repository.findDomainValue(settingKey, domainId);
    }

    async getSettingsForRootDomain(options: GetOptions) {
        const settings = await this.repository.list({ ilc: options.ilc, range: options.range });

        settings.data = options.allowedForDomains
            ? this.filterAllowedForDomainsSettingsKeys(settings.data)
            : settings.data;

        const parsedSettings = this.parseSettings(settings.data);

        return {
            data: Array.isArray(parsedSettings) ? parsedSettings : [parsedSettings],
            pagination: settings.pagination,
        };
    }

    async getSettingsForDomainById(domainId: number, options: GetOptions) {
        const settings = await this.repository.listWithDomainValue(domainId, options.range);

        const parsedSettings = this.parseSettings(settings.data);

        return {
            data: Array.isArray(parsedSettings) ? parsedSettings : [parsedSettings],
            pagination: settings.pagination,
        };
    }

    async getSettingsForDomainByIdForConfig(domainId: number, options: GetOptions) {
        const settings = await this.repository.listWithOptionalDomainValue(domainId, {
            ilc: options.ilc,
            range: options.range,
        });

        const settingsData = settings.data.map((item) => {
            if (item.domainValue) {
                return { ...item, value: item.domainValue };
            }
            return item;
        });

        const parsedSettings = this.parseSettings(settingsData);

        return {
            data: Array.isArray(parsedSettings) ? parsedSettings : [parsedSettings],
            pagination: settings.pagination,
        };
    }

    async getSettingsForDomainByName(domainName: string, options: GetOptions) {
        const domainId = await this.routerDomainsRepository.findIdByDomainName(domainName);

        if (domainId) {
            return this.getSettingsForDomainByIdForConfig(domainId, options);
        } else {
            return this.getSettingsForRootDomain(options);
        }
    }

    async getSettingsForConfig(domainName?: string) {
        const settings = domainName
            ? await this.getSettingsForDomainByName(domainName, { allowedForDomains: null, ilc: true })
            : await this.getSettingsForRootDomain({ allowedForDomains: null, ilc: true });

        return this.omitEmptyAndNullValues(settings.data).reduce((acc: Record<string, any>, setting) => {
            set(acc, setting.key, setting.value);
            return acc;
        }, {});
    }

    async createSettingForDomain(
        settingKey: SettingKeys,
        value: unknown,
        domainId: number,
        user: User | undefined,
    ): Promise<DomainSettingRow> {
        if (!AllowedSettingKeysForDomains.includes(settingKey)) {
            throw new UnprocessableContent({ message: `Setting key ${settingKey} is not allowed for domains` });
        }

        if (!(await this.routerDomainsRepository.exists(domainId))) {
            throw new UnprocessableContent({ message: `Domain with id ${domainId} does not exist` });
        }

        const stringified = JSON.stringify(value);

        return this.versioning.withVersion(user, { type: EntityTypes.settings_domain_value }, (trx) =>
            this.repository.insertDomainValue({ key: settingKey, value: stringified, domainId }, trx),
        );
    }

    private parseSettings(settings: SettingRaw | SettingRaw[]) {
        if (Array.isArray(settings)) {
            return settings.map((setting) => this.parseSetting(setting));
        }

        return this.parseSetting(settings);
    }

    private isSettingTypeGuard(json: JSONValue): boolean {
        if (!json) return false;

        if (typeof json !== 'object') return false;

        if (!Reflect.has(json, 'key')) return false;

        if (!Reflect.has(json, 'value')) return false;

        if (!Reflect.has(json, 'default')) return false;

        if (!Reflect.has(json, 'scope')) return false;

        if (!Reflect.has(json, 'secret')) return false;

        if (!Reflect.has(json, 'meta')) return false;

        const meta = Reflect.get(json, 'meta');

        if (typeof meta !== 'object' || meta === null) return false;

        return true;
    }

    private parseSetting(setting: SettingRaw): SettingParsed {
        const parsedSetting: SettingParsed = safeParseJSON<SettingParsed>(setting, this.isSettingTypeGuard);

        if (
            parsedSetting.value === undefined ||
            (parsedSetting.value === null && parsedSetting.default !== undefined)
        ) {
            parsedSetting.value = parsedSetting.default;
        }

        if (isNumeric(parsedSetting.value)) {
            // values are stored as text
            parsedSetting.value = parseInt(parsedSetting.value as string, 10);
        }
        if (parsedSetting.meta.type === SettingTypes.Boolean) {
            parsedSetting.value = Boolean(parsedSetting.value);
        }

        parsedSetting.secret = Boolean(parsedSetting.secret);

        if (parsedSetting.secret) {
            delete parsedSetting.value;
            delete parsedSetting.default;
        }

        parsedSetting.protected = this.protectedSettings.includes(setting.key) ? true : undefined;

        return parsedSetting;
    }

    private filterAllowedForDomainsSettingsKeys(settings: SettingRaw[]) {
        return settings.filter((setting) => {
            return AllowedSettingKeysForDomains.some((key) => key === setting.key);
        });
    }

    // Make code backward compatible with previous implementation
    // I would prefer not to do such implicit logic and respond with real DTO :(
    public omitEmptyAndNullValues(settings: SettingParsed[]): SettingParsed[] {
        return settings.map((setting) => {
            const filteredEntries = Object.entries(setting).filter(([_, value]) => value !== null && value !== '');
            const filtered = Object.fromEntries(filteredEntries) as SettingParsed;
            return filtered;
        });
    }

    public async deleteDomainSetting(id: number): Promise<void> {
        const existingSetting = await this.repository.findDomainValueById(id);

        if (!existingSetting) {
            throw new NotFoundError();
        }

        await this.repository.deleteDomainValue(id);
    }

    public async getDomainMergedSetting(settingKey: string, domainId: number | null = null): Promise<SettingParsed> {
        // Both exist for the keys the routes accept, their absence was a 500 before as well
        const setting = defined(await this.repository.findByKey(settingKey));

        if (domainId) {
            const domainSetting = defined(await this.repository.findDomainValue(settingKey, domainId));
            setting.id = domainSetting.id;
            setting.value = domainSetting.value;
            setting.domainId = domainSetting.domainId;
        }
        return this.parseSetting(setting);
    }
}
