import { Knex } from 'knex';
import { SettingKeys, Scope } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([
        {
            key: SettingKeys.AuthOpenIdUniqueIdentifierClaimName,
            value: JSON.stringify(''),
            default: JSON.stringify(''),
            scope: Scope.Registry,
            secret: 0,
            meta: JSON.stringify({
                type: 'string',
            }),
        },
    ]);
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [SettingKeys.AuthOpenIdUniqueIdentifierClaimName]).delete();
}
