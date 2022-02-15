import { Knex } from "knex";
import {
    Setting,
    SettingKeys,
    TrailingSlashValues,
    Scope,
    SettingTypes,
} from "../settings/interfaces";


export async function up(knex: Knex): Promise<any> {
    const settings: Setting[] = [{
        key: SettingKeys.BaseUrl,
        value: 'http://localhost:4001/',
        default: 'http://localhost:4001/',
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.Url,
        },
    }, {
        key: SettingKeys.TrailingSlash,
        value: TrailingSlashValues.DoNothing,
        default: TrailingSlashValues.DoNothing,
        scope: Scope.Ilc,
        secret: false,
        meta: {
            type: SettingTypes.Enum,
            choices: [
                TrailingSlashValues.DoNothing,
                TrailingSlashValues.redirectToNonTrailingSlash,
                TrailingSlashValues.redirectToTrailingSlash,
            ],
        },
    }, {
        key: SettingKeys.AmdDefineCompatibilityMode,
        value: false,
        default: false,
        scope: Scope.Ilc,
        secret: false,
        meta: {
            type: SettingTypes.Boolean,
        },
    }, {
        key: SettingKeys.AuthOpenIdEnabled,
        value: false,
        default: false,
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.Boolean,
        },
    }, {
        key: SettingKeys.AuthOpenIdDiscoveryUrl,
        value: '',
        default: '',
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.Url,
        },
    }, {
        key: SettingKeys.AuthOpenIdClientId,
        value: '',
        default: '',
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.String,
        },
    }, {
        key: SettingKeys.AuthOpenIdClientSecret,
        value: 'secret',
        default: 'secret',
        scope: Scope.Registry,
        secret: true,
        meta: {
            type: SettingTypes.Password,
        },
    }, {
        key: SettingKeys.AuthOpenIdResponseMode,
        value: 'query',
        default: 'query',
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.String,
        },
    }, {
        key: SettingKeys.AuthOpenIdIdentifierClaimName,
        value: 'unique_name',
        default: 'unique_name',
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.String,
        },
    }, {
        key: SettingKeys.AuthOpenIdRequestedScopes,
        value: 'openid',
        default: 'openid',
        scope: Scope.Registry,
        secret: false,
        meta: {
            type: SettingTypes.String,
        },
    }];

    return knex.transaction(async (transaction) => {
        await Promise.all(settings.map(async (setting) => {
            const [selected] = await knex('settings').where('key', setting.key).transacting(transaction);
            const toUpdate = {
                default: JSON.stringify(setting.default),
                scope: setting.scope,
                secret: setting.secret,
                meta: JSON.stringify(setting.meta),
            };

            if (selected === undefined) {
                await knex('settings').insert({
                    key: setting.key,
                    value: JSON.stringify(setting.value),
                    ...toUpdate
                }).transacting(transaction);
            } else {
                await knex('settings').where('key', setting.key).update(toUpdate).transacting(transaction);
            }
        }));
    });
}


export async function down(knex: Knex): Promise<any> {

}

