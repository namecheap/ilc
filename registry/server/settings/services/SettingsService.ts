import db from '../../db';
import {SettingKeys, Setting} from '../interfaces';

export class SettingsService {
    private defaultVals: { [key in SettingKeys]: any; } = {
        [SettingKeys.BaseUrl]: 'http://localhost:4001/',
        [SettingKeys.AuthOpenIdEnabled]: false,
        [SettingKeys.AuthOpenIdDiscoveryUrl]: '',
        [SettingKeys.AuthOpenIdClientId]: '',
        [SettingKeys.AuthOpenIdClientSecret]: '',
        [SettingKeys.AuthOpenIdResponseMode]: 'query',
    };

    private changesTracking: any = {};

    //TODO: implement cache
    //private cache: any = {};

    constructor() {}

    async get(key: SettingKeys, callerId: string|null = null): Promise<any> {
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
        const [res] = await db.select().from<Setting>('settings').where('key', key);

        let value;
        if (!res) {
            value = this.defaultVals[key];
        } else {
            value = JSON.parse(res.value);
        }

        return value;
    }
}

// const a = new SettingsService();
// a.get(SettingKeys.AuthOpenIdClientId)

export default new SettingsService();
