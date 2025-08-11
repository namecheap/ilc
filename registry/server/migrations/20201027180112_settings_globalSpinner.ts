import { Knex } from 'knex';
import { Scope, SettingKeys } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([
        {
            key: SettingKeys.GlobalSpinnerEnabled,
            value: JSON.stringify(true),
            default: JSON.stringify(true),
            scope: Scope.Ilc,
            secret: false,
            meta: JSON.stringify({
                type: 'boolean',
            }),
        },
        {
            key: SettingKeys.GlobalSpinnerCustomHtml,
            value: JSON.stringify(''),
            default: JSON.stringify(''),
            scope: Scope.Ilc,
            secret: false,
            meta: JSON.stringify({
                type: 'string',
            }),
        },
    ]);
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings')
        .whereIn('key', [SettingKeys.GlobalSpinnerEnabled, SettingKeys.GlobalSpinnerCustomHtml])
        .delete();
}
