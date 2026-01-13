import { Knex } from 'knex';

import { EntityTypes } from '../versioning/interfaces';
import { sanitizeSnapshot, Snapshot } from '../versioning/utils/secretSanitizer';

const ENTITY_TYPES = [EntityTypes.settings, EntityTypes.settings_domain_value, EntityTypes.auth_entities];

function sanitizeIfChanged(json: string | null, entityType: string, secretKeys: Set<string>): string | null {
    if (!json) {
        return null;
    }
    const sanitized = JSON.stringify(sanitizeSnapshot(entityType, JSON.parse(json) as Snapshot, secretKeys));
    return sanitized !== json ? sanitized : null;
}

export async function up(knex: Knex): Promise<void> {
    const secretSettings: { key: string }[] = await knex('settings').select('key').where('secret', true);
    const secretKeys = new Set(secretSettings.map((s) => s.key));

    let count = 0;
    const stream = knex('versioning')
        .select('id', 'entity_type', 'data', 'data_after')
        .whereIn('entity_type', ENTITY_TYPES)
        .stream();

    for await (const row of stream) {
        const data = sanitizeIfChanged(row.data, row.entity_type, secretKeys);
        const dataAfter = sanitizeIfChanged(row.data_after, row.entity_type, secretKeys);

        if (data || dataAfter) {
            const update: Record<string, string> = {};
            if (data) {
                update.data = data;
            }
            if (dataAfter) {
                update.data_after = dataAfter;
            }
            await knex('versioning').where('id', row.id).update(update);
            count++;
        }
    }

    console.log(`Sanitized ${count} versioning records`);
}

export async function down(): Promise<void> {
    throw new Error('Irreversible migration: secret values cannot be recovered');
}
