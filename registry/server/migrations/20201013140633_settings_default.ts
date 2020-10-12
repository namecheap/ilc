import * as Knex from "knex";
import {Setting, SettingKeys, TrailingSlashValues} from '../settings/interfaces';


export async function up(knex: Knex): Promise<any> {
    const settings: Setting[] = [{
        key: SettingKeys.BaseUrl,
        value: JSON.stringify('http://localhost:4001/'),
        secured: true,
    }, {
        key: SettingKeys.TrailingSlash,
        value: JSON.stringify(TrailingSlashValues.DoNothing),
        secured: false,
    }, {
        key: SettingKeys.AuthOpenIdEnabled,
        value: JSON.stringify(false),
        secured: true,
    }, {
        key: SettingKeys.AuthOpenIdDiscoveryUrl,
        value: JSON.stringify(''),
        secured: true,
    }, {
        key: SettingKeys.AuthOpenIdClientId,
        value: JSON.stringify(''),
        secured: true,
    }, {
        key: SettingKeys.AuthOpenIdClientSecret,
        value: JSON.stringify(''),
        secured: true,
    }, {
        key: SettingKeys.AuthOpenIdResponseMode,
        value: JSON.stringify('query'),
        secured: true,
    }, {
        key: SettingKeys.AuthOpenIdIdentifierClaimName,
        value: JSON.stringify('unique_name'),
        secured: true,
    }, {
        key: SettingKeys.AuthOpenIdRequestedScopes,
        value: JSON.stringify('openid'),
        secured: true,
    }, {
        key: SettingKeys.AmdDefineCompatibilityMode,
        value: JSON.stringify(false),
        secured: false,
    }];

    return knex.transaction(async (transaction) => {
        await Promise.all(settings.map(async ({key, value, secured}) => {
            const count = await knex('settings').where({key}).transacting(transaction);

            if (!count.length) {
                await knex('settings').insert({key, value, secured}).transacting(transaction);
            }
        }));
    });
}


export async function down(knex: Knex): Promise<any> {

}

