import type { Knex } from 'knex';

import type { PaginatedResult } from '../../../typings/PaginatedResult';
import { Scope, type DomainSettingRow, type SettingRaw } from '../interfaces';

export class SettingsRepository {
    constructor(private readonly db: Knex) {}

    async findByKey(key: string): Promise<SettingRaw | undefined> {
        const [setting] = await this.db('settings').select().where('key', key);
        return setting;
    }

    async list({ ilc, range }: { ilc?: boolean; range?: string }): Promise<PaginatedResult<SettingRaw>> {
        const whereCond = ilc ? { scope: Scope.Ilc } : {};

        return this.db('settings')
            .select()
            .from<SettingRaw, SettingRaw[]>('settings')
            .where(whereCond)
            .orderBy('settings.key', 'asc')
            .range(range);
    }

    /** The settings that have a value for the domain, with that value */
    async listWithDomainValue(domainId: number, range: string | undefined): Promise<PaginatedResult<SettingRaw>> {
        return this.db
            .from('settings')
            .innerJoin('settings_domain_value', 'settings.key', 'settings_domain_value.key')
            .where('settings_domain_value.domainId', domainId)
            .select<
                SettingRaw[]
            >('settings.key', 'settings.default', 'settings.scope', 'settings.secret', 'settings.meta', 'settings_domain_value.value as value', 'settings_domain_value.domainId as domainId')
            .orderBy('settings.key', 'asc')
            .range(range);
    }

    /** All settings, each with the domain's value as domainValue when it has one */
    async listWithOptionalDomainValue(
        domainId: number,
        { ilc, range }: { ilc?: boolean; range?: string },
    ): Promise<PaginatedResult<SettingRaw>> {
        const whereCond = ilc ? { scope: Scope.Ilc } : {};

        return this.db
            .from('settings')
            .leftJoin(
                this.db
                    .from('settings_domain_value')
                    .select('value as domainValue', 'domainId', 'key')
                    .where('domainId', domainId)
                    .as('sdv'),
                'settings.key',
                'sdv.key',
            )
            .select<SettingRaw[]>(
                'settings.key',
                'settings.default',
                'settings.scope',
                'settings.secret',
                'settings.meta',
                'settings.value',
                'domainValue',
                'domainId',
            )
            .andWhere(whereCond)
            .orderBy('settings.key', 'asc')
            .range(range);
    }

    async updateValue(key: string, value: string, trx: Knex.Transaction): Promise<void> {
        await trx('settings').where('key', key).update('value', value);
    }

    async findDomainValue(key: string, domainId: number): Promise<DomainSettingRow | undefined> {
        const [setting] = await this.db('settings_domain_value').where({ key, domainId });
        return setting;
    }

    async findDomainValueById(id: number): Promise<DomainSettingRow | undefined> {
        return this.db('settings_domain_value').where({ id }).first();
    }

    async insertDomainValue(setting: Omit<DomainSettingRow, 'id'>, trx: Knex.Transaction): Promise<DomainSettingRow> {
        const [row] = await trx('settings_domain_value').insert(setting).returning('*');
        return row;
    }

    async updateDomainValue(id: number, value: string, trx: Knex.Transaction): Promise<void> {
        await trx('settings_domain_value').where({ id }).update('value', value);
    }

    async deleteDomainValue(id: number): Promise<void> {
        await this.db('settings_domain_value').where({ id }).delete();
    }
}
