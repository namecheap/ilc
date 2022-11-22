import { Knex } from 'knex';
import { Scope, SettingKeys, SettingTypes, OnPropsUpdateValues } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert({
            key: SettingKeys.СspConfig,
            value: 'null',
            default: 'null',
            scope: Scope.Ilc,
            secret: 0,
            meta: JSON.stringify({
                type: SettingTypes.JSON,
            }),
        });
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [SettingKeys.СspConfig]).delete();
}
