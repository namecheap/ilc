import { User } from '../../../typings/User';
import { JSONValue, isNumeric, safeParseJSON } from '../../common/services/json';
import db from '../../db';
import { NotFoundError, UnprocessableContent } from '../../errorHandler/httpErrors';
import { extractInsertedId } from '../../util/db';
import { set } from '../../util/set';
import {
    AllowedSettingKeysForDomains,
    DomainSetting,
    Scope,
    SettingKeys,
    SettingParsed,
    SettingRaw,
    SettingTypes,
    SettingValue,
} from '../interfaces';

type GetOptions = {
    range?: string;
    ilc?: boolean;
    allowedForDomains: boolean | null;
};

export class SettingsService {
    private changesTracking: any = {};

    //TODO: implement cache
    //private cache: any = {};

    constructor() {}

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

    async set(settingKey: SettingKeys, value: any, user: User) {
        await db.versioning(user, { type: 'settings', id: settingKey }, async (trx) => {
            await db('settings').where('key', settingKey).update('value', JSON.stringify(value)).transacting(trx);
        });
    }

    private async getValue(key: SettingKeys): Promise<SettingValue | undefined> {
        const [setting] = await db('settings').select().where('key', key);

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

    async updateRootSetting(settingKey: SettingKeys, value: unknown, user: User): Promise<SettingRaw> {
        await db.versioning(user, { type: 'settings', id: settingKey }, async (trx) => {
            await db('settings').where('key', settingKey).update('value', JSON.stringify(value)).transacting(trx);
        });

        const [updated] = await db('settings').select().where('key', settingKey);
        return updated;
    }

    async updateDomainSetting(
        settingKey: SettingKeys,
        value: unknown,
        domainId: number,
        user: User,
    ): Promise<DomainSetting> {
        const [setting] = await db('settings_domain_value').where({ key: settingKey, domainId: domainId });
        if (!setting) {
            return await this.createSettingForDomain(settingKey, value, domainId, user);
        }

        await db.versioning(user, { type: 'settings_domain_value', id: setting.id }, async (trx) => {
            await db('settings_domain_value')
                .where({ id: setting.id })
                .update('value', JSON.stringify(value))
                .transacting(trx);
        });

        const [updated] = await db('settings_domain_value').where({ key: settingKey, domainId: domainId });

        return updated;
    }

    async getSettingsForRootDomain(options: GetOptions) {
        // There is no type safe interface in knex v1 :(

        const whereCond = options.ilc ? { scope: Scope.Ilc } : {};

        const settings = await db('settings')
            .select()
            .from<SettingRaw, SettingRaw[]>('settings')
            .where(whereCond)
            .range(options.range);

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
        const settings = await db
            .from('settings')
            .innerJoin('settings_domain_value', 'settings.key', 'settings_domain_value.key')
            .where('settings_domain_value.domainId', domainId)
            .select<
                SettingRaw[]
            >('settings.key', 'settings.default', 'settings.scope', 'settings.secret', 'settings.meta', 'settings_domain_value.value as value', 'settings_domain_value.domainId as domainId')
            .range(options.range);

        const parsedSettings = this.parseSettings(settings.data);

        return {
            data: Array.isArray(parsedSettings) ? parsedSettings : [parsedSettings],
            pagination: settings.pagination,
        };
    }

    async getSettingsForDomainByIdForConfig(domainId: number, options: GetOptions) {
        const whereCond = options.ilc ? { scope: Scope.Ilc } : {};

        const settings = await db
            .from('settings')
            .leftJoin(
                db
                    .from('settings_domain_value')
                    .select('value as domainValue', 'domainId', 'key')
                    .where('domainId', domainId)
                    .as('sdv'),
                'settings.key',
                'sdv.key',
            )
            .select<SettingRaw[]>(
                'settings.key',
                'settings.default',
                'settings.scope',
                'settings.secret',
                'settings.meta',
                'settings.value',
                'domainValue',
                'domainId',
            )
            .andWhere(whereCond)
            .range(options.range);

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
        const domain = await db('router_domains').first('id').where({ domainName: domainName });

        if (domain && domain.id) {
            return this.getSettingsForDomainByIdForConfig(domain.id, options);
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
        user: User,
    ): Promise<DomainSetting> {
        if (!AllowedSettingKeysForDomains.includes(settingKey)) {
            throw new UnprocessableContent({ message: `Setting key ${settingKey} is not allowed for domains` });
        }

        const [{ total }] = await db
            .from<{ total: string | number }>('router_domains')
            .count('id as total')
            .where('id', domainId);

        if (Number(total) === 0) {
            throw new UnprocessableContent({ message: `Domain with id ${domainId} does not exist` });
        }

        const stringified = JSON.stringify(value);

        let savedSettingId: number | undefined;
        await db.versioning(user, { type: 'settings_domain_value' }, async (trx) => {
            const result = await db('settings_domain_value').insert(
                { key: settingKey, value: stringified, domainId },
                'id',
            );
            savedSettingId = extractInsertedId(result);
            return savedSettingId;
        });

        const [savedSetting] = await db('settings_domain_value').select().where('id', savedSettingId);
        return savedSetting;
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
        const parsedSetting: SettingParsed = safeParseJSON<SettingParsed>(settings, this.isSettingTypeGuard);

        if (
            parsedSetting.value === undefined ||
            (parsedSetting.value === null && parsedSetting.default !== undefined)
        ) {
            parsedSetting.value = parsedSetting.default;
        }

        if (isNumeric(parsedSetting.value)) {
            // handle sqlite's 0/1
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

        return parsedSetting;
    }

    private filterAllowedForDomainsSettingsKeys(settings: SettingRaw[]) {
        return settings.filter((setting: { key: any }) => {
            return AllowedSettingKeysForDomains.includes(setting.key);
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

    public async deleteDomainSetting(id: string): Promise<void> {
        const existingSetting = await db('settings_domain_value')
            .where({ id: Number(id) })
            .first();

        if (!existingSetting) {
            throw new NotFoundError();
        }

        await db('settings_domain_value')
            .where({ id: Number(id) })
            .delete();
    }

    public async getDomainMergedSetting(settingKey: string, domainId: number | null = null): Promise<SettingParsed> {
        const [setting] = await db('settings').select().where('key', settingKey);

        if (domainId) {
            const [domainSetting] = await db('settings_domain_value')
                .select()
                .where('key', settingKey)
                .andWhere('domainId', domainId);
            setting.id = domainSetting.id;
            setting.value = domainSetting.value;
            setting.domainId = domainSetting.domainId;
        }
        return this.parseSetting(setting);
    }
}

export const settingsService = new SettingsService();
export default settingsService;
