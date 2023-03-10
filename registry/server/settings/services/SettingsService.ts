import db from '../../db';
import { SettingKeys } from '../interfaces';
import { User } from '../../auth';

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
}

export default new SettingsService();
