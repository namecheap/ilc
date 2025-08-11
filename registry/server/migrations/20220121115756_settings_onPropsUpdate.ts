import { Knex } from 'knex';
import { Scope, SettingKeys, SettingTypes, OnPropsUpdateValues } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([
        {
            key: SettingKeys.OnPropsUpdate,
            value: OnPropsUpdateValues.Remount,
            default: OnPropsUpdateValues.Remount,
            scope: Scope.Ilc,
            secret: false,
            meta: JSON.stringify({
                type: SettingTypes.Enum,
                choices: Object.values(OnPropsUpdateValues),
            }),
        },
    ]);
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [SettingKeys.OnPropsUpdate]).delete();
}
