import { Knex } from 'knex';
import { Scope, SettingKeys, SettingTypes } from '../settings/interfaces';

export async function up(knex: Knex): Promise<void> {
    await knex('settings').insert({
        key: SettingKeys.CspEnableStrict,
        value: 'false',
        default: 'false',
        scope: Scope.Ilc,
        secret: false,
        meta: JSON.stringify({
            type: SettingTypes.Boolean,
        }),
    });
}

export async function down(knex: Knex): Promise<void> {}
