import { Knex } from "knex";
import {RoutingStrategyValues, Scope, SettingKeys, SettingTypes} from "../settings/interfaces";


export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([{
        key: SettingKeys.I18nEnabled,
        value: JSON.stringify(false),
        default: JSON.stringify(false),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.Boolean
        })
    },{
        key: SettingKeys.I18nDefaultLocale,
        value: JSON.stringify('en-US'),
        default: JSON.stringify('en-US'),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.String
        })
    },{
        key: SettingKeys.I18nDefaultCurrency,
        value: JSON.stringify('USD'),
        default: JSON.stringify('USD'),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.String
        })
    },{
        key: SettingKeys.I18nSupportedLocales,
        value: JSON.stringify(['en-US', 'ua-UA']),
        default: JSON.stringify(['en-US', 'ua-UA']),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.StringArray
        })
    },{
        key: SettingKeys.I18nSupportedCurrencies,
        value: JSON.stringify(['USD', 'UAH']),
        default: JSON.stringify(['USD', 'UAH']),
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.StringArray
        })
    },{
        key: SettingKeys.I18nRoutingStrategy,
        value: RoutingStrategyValues.PrefixExceptDefault,
        default: RoutingStrategyValues.PrefixExceptDefault,
        scope: Scope.Ilc,
        secret: 0,
        meta: JSON.stringify({
            type: SettingTypes.Enum,
            choices: Object.values(RoutingStrategyValues),
        }),
    }]);
}


export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', [
        SettingKeys.I18nEnabled,
        SettingKeys.I18nDefaultLocale,
        SettingKeys.I18nDefaultCurrency,
        SettingKeys.I18nSupportedLocales,
        SettingKeys.I18nSupportedCurrencies,
        SettingKeys.I18nRoutingStrategy,
    ]).delete();
}

