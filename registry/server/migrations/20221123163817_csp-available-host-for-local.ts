import { Knex } from 'knex';
import { Scope, SettingKeys, SettingTypes, OnPropsUpdateValues } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert({
        key: SettingKeys.CspTrustedLocalHosts,
        value: JSON.stringify(['https://localhost']),
        default: JSON.stringify(['https://localhost']),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.StringArray,
        }),
    });
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [SettingKeys.CspTrustedLocalHosts]).delete();
}
