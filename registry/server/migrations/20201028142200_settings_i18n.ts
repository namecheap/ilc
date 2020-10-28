import * as Knex from "knex";
import {SettingKeys} from "../settings/interfaces";


export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([{
        key: SettingKeys.I18nEnabled,
        value: JSON.stringify(false),
        default: JSON.stringify(false),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'boolean'
        })
    },{
        key: SettingKeys.I18nDefaultLocale,
        value: JSON.stringify('en-US'),
        default: JSON.stringify('en-US'),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'string'
        })
    },{
        key: SettingKeys.I18nDefaultCurrency,
        value: JSON.stringify('USD'),
        default: JSON.stringify('USD'),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'string'
        })
    },{
        key: SettingKeys.I18nSupportedLocales,
        value: JSON.stringify(['en-US', 'ua-UA']),
        default: JSON.stringify(['en-US', 'ua-UA']),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'string[]'
        })
    },{
        key: SettingKeys.I18nSupportedCurrencies,
        value: JSON.stringify(['USD', 'UAH']),
        default: JSON.stringify(['USD', 'UAH']),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'string[]'
        })
    }]);
}


export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [
        SettingKeys.I18nEnabled,
        SettingKeys.I18nDefaultLocale,
        SettingKeys.I18nDefaultCurrency,
        SettingKeys.I18nSupportedLocales,
        SettingKeys.I18nSupportedCurrencies,
    ]).delete();
}

