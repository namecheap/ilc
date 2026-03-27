import { Knex } from 'knex';
import { Scope, SettingKeys, SettingTypes } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([
        {
            key: SettingKeys.FragmentProxyHeaders,
            value: 'null',
            default: 'null',
            scope: Scope.Ilc,
            secret: false,
            meta: JSON.stringify({
                type: SettingTypes.StringArray,
            }),
        },
        {
            key: SettingKeys.TemplateProxyHeaders,
            value: 'null',
            default: 'null',
            scope: Scope.Ilc,
            secret: false,
            meta: JSON.stringify({
                type: SettingTypes.StringArray,
            }),
        },
    ]);
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings')
        .whereIn('key', [SettingKeys.FragmentProxyHeaders, SettingKeys.TemplateProxyHeaders])
        .delete();
}
