import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    await knex('settings').insert([{
        key: 'globalSpinner.enabled',
        value: JSON.stringify(true),
        default: JSON.stringify(true),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'boolean'
        })
    },{
        key: 'globalSpinner.customHTML',
        value: JSON.stringify(''),
        default: JSON.stringify(''),
        scope: 'ilc',
        secret: 0,
        meta: JSON.stringify({
            type: 'string'
        })
    }]);
}


export async function down(knex: Knex): Promise<any> {
    await knex('settings').whereIn('key', ['globalSpinner.enabled', 'globalSpinner.customHTML']).delete();
}

