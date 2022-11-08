import { Knex } from 'knex';
import { SettingKeys } from '../settings/interfaces';

export async function up(knex: Knex): Promise<any> {
    await knex('settings')
        .update({
            value: JSON.stringify(true),
            default: JSON.stringify(true),
        })
        .where('key', SettingKeys.I18nEnabled);
}

export async function down(knex: Knex): Promise<any> {
    await knex('settings')
        .update({
            value: JSON.stringify(false),
            default: JSON.stringify(false),
        })
        .where('key', SettingKeys.I18nEnabled);
}
