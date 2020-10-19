import db from '../../db';
import {SettingKeys} from '../interfaces';

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

    async set(key: SettingKeys, value: any) {
        //TODO
    }

    private async getVal(key: SettingKeys): Promise<any> {
        const [setting] = await db.select().from('settings').where('key', key);
        const value = JSON.parse(setting.value);

        if (setting.value !== '') {
            return value;
        }

        const defaultValue = JSON.parse(setting.default);

        if (defaultValue !== '') {
            return defaultValue;
        }

        return JSON.parse(setting.value);
    }
}

export default new SettingsService();
