import { Knex } from "knex";
import { Scope, SettingKeys, SettingTypes } from "../settings/interfaces";

export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([{
        key: SettingKeys.OverrideConfigTrustedOrigins,
        value: JSON.stringify(''), // value "all" allows any origin.
        default: JSON.stringify(''),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.String
        })
    }]);
}


export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [
        SettingKeys.OverrideConfigTrustedOrigins,
    ]).delete();
}
