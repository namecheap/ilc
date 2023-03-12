import db from '../../db';
import { SettingKeys } from '../interfaces';
import { User } from '../../auth';
import { AllowedSettingKeysForDomains } from '../interfaces';
import { SettingRaw, SettingParsed, Setting } from '../interfaces';
import { safeParseJSON, JSONValue } from '../../common/services/json';

type GetOptions = {
    range?: string;
    allowedForDomains: boolean | null;
};

type SettingDto = {
    data: SettingRaw[];
    pagination: {
        total: number;
    };
};

export class SettingsService {
    private changesTracking: any = {};

    //TODO: implement cache
    //private cache: any = {};

    constructor() {}

    async get(key: SettingKeys, callerId: string | null = null): Promise<any> {
        const value = await this.getVal(key);

        if (callerId) {
            if (this.changesTracking[callerId] === undefined) {
                this.changesTracking[callerId] = {};
            }

            this.changesTracking[callerId][key] = value;
        }

        return value;
    }

    async hasChanged(callerId: string, keys: SettingKeys[]): Promise<boolean> {
        for (let key of keys) {
            const val = await this.getVal(key);

            if (!this.changesTracking[callerId] || val !== this.changesTracking[callerId][key]) {
                return true;
            }
        }

        return false;
    }

    async set(settingKey: SettingKeys, value: any, user: User) {
        await db.versioning(user, { type: 'settings', id: settingKey }, async (trx) => {
            await db('settings').where('key', settingKey).update('value', JSON.stringify(value)).transacting(trx);
        });
    }

    private async getVal(key: SettingKeys): Promise<any> {
        const [setting] = await db.select().from('settings').where('key', key);

        if (setting === undefined) {
            return;
        }

        const value = JSON.parse(setting.value);

        if (value !== '') {
            return value;
        }

        const defaultValue = JSON.parse(setting.default);

        if (defaultValue !== '') {
            return defaultValue;
        }
    }

    async updateRootSetting(settingKey: SettingKeys, value: any, user: User) {
        await db.versioning(user, { type: 'settings', id: settingKey }, async (trx) => {
            await db('settings').where('key', settingKey).update('value', JSON.stringify(value)).transacting(trx);
        });

        const [updated] = await db.select().from('settings').where('key', settingKey);

        return updated;
    }

    async updateDomainSetting(settingKey: SettingKeys, value: any, domainId: number, user: User) {
        const [{ id }] = await db('settings_domain_value').where({ key: settingKey, domainId: domainId });

        await db.versioning(user, { type: 'settings_domain_value', id }, async (trx) => {
            await db('settings_domain_value').where({ id }).update('value', JSON.stringify(value)).transacting(trx);
        });

        const [updated] = await db('settings_domain_value').where({ key: settingKey, domainId: domainId });

        return updated;
    }

    async getSettingsForRootDomain(options: GetOptions) {
        // There is no type safe interface in knex v1 :(
        const settings = await db.select().from<SettingRaw>('settings').range(options.range);

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
        const settings = (await db
            .select()
            .from('settings')
            .innerJoin('settings_domain_value', 'settings.key', 'settings_domain_value.key')
            .where('settings_domain_value.domainId', domainId)
            .select('settings.*', 'settings_domain_value.value as value', 'settings_domain_value.domainId as domainId')
            .range(options.range)) as SettingDto;

        const parsedSettings = this.parseSettings(settings.data);

        return {
            data: Array.isArray(parsedSettings) ? parsedSettings : [parsedSettings],
            pagination: settings.pagination,
        };
    }

    async getSettingsForDomainByName(domainName: string, options: GetOptions) {
        const domain = await db('router_domains').first('id').where({ domainName: domainName });

        if (domain && domain.id) {
            return this.getSettingsForDomainById(domain.id, options);
        } else {
            return this.getSettingsForRootDomain(options);
        }
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

    private parseSetting(settings: SettingRaw): SettingParsed {
        const parsedSetting: SettingParsed = safeParseJSON<Setting>(settings, this.isSettingTypeGuard);

        if (parsedSetting.value === undefined && parsedSetting.default !== undefined) {
            parsedSetting.value = parsedSetting.default;
        }

        parsedSetting.secret = Boolean(parsedSetting.secret);

        if (parsedSetting.secret) {
            delete parsedSetting.value;
            delete parsedSetting.default;
        }

        return parsedSetting;
    }

    private filterAllowedForDomainsSettingsKeys(settings: SettingRaw[]) {
        return settings.filter((setting: { key: any }) => {
            return AllowedSettingKeysForDomains.includes(setting.key);
        });
    }

    // Make code backward compatible with previous implementation
    // I would prefer not to do such implicit logic and respond with real DTO :(
    public omitEmptyAndNullValues(settings: SettingParsed[]): Partial<SettingParsed>[] {
        return settings.map((setting) => {
            const filteredEntries = Object.entries(setting).filter(([_, value]) => value !== null && value !== '');
            return Object.fromEntries(filteredEntries);
        });
    }
}

export const settingsService = new SettingsService();
export default settingsService;
