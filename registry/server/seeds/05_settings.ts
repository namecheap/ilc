import * as Knex from 'knex';

import {
    Setting,
    SettingKeys,
} from '../settings/interfaces';

const overrideConfigTrustedOrigins = process.env.OVERRIDE_CONFIG_TRUSTED_ORIGINS;

export async function seed(knex: Knex): Promise<any> {
    const settings: Pick<Setting, 'key' | 'value'>[] = [];

    if (overrideConfigTrustedOrigins) {
        settings.push({
            key: SettingKeys.OverrideConfigTrustedOrigins,
            value: overrideConfigTrustedOrigins,
        });
    }

    if (settings.length === 0) {
        return;
    }

    return knex.transaction(async (transaction) => {
        await Promise.all(settings.map(async (setting) => {
            await knex('settings').where('key', setting.key).update({
                value: JSON.stringify(setting.value),
            }).transacting(transaction);
        }));
    });
}
