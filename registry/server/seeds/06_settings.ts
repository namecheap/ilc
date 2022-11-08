import { Knex } from 'knex';

import { Setting, SettingKeys } from '../settings/interfaces';

const overrideConfigTrustedOrigins = process.env.OVERRIDE_CONFIG_TRUSTED_ORIGINS;

export async function seed(knex: Knex): Promise<any> {
    const settings: Pick<Setting, 'key' | 'value'>[] = [];

    if (overrideConfigTrustedOrigins) {
        settings.push({
            key: SettingKeys.OverrideConfigTrustedOrigins,
            value: overrideConfigTrustedOrigins,
        });
    } else {
        const [setting] = await knex('settings')
            .select('default')
            .where('key', SettingKeys.OverrideConfigTrustedOrigins);

        settings.push({
            key: SettingKeys.OverrideConfigTrustedOrigins,
            value: JSON.parse(setting.default),
        });
    }

    return knex.transaction(async (transaction) => {
        await Promise.all(
            settings.map(async (setting) => {
                await knex('settings')
                    .where('key', setting.key)
                    .update({
                        value: JSON.stringify(setting.value),
                    })
                    .transacting(transaction);
            }),
        );
    });
}
