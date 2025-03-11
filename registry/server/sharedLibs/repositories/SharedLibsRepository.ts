import { PaginatedResult } from '../../../typings/PaginatedResult';
import db, { VersionedKnex } from '../../db';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { SharedLib } from '../interfaces';

export interface SharedLibsGetListFilters {
    name?: string;
}

interface SharedLibsGetListOptions {
    range?: string;
}

export class SharedLibsRepository {
    constructor(private readonly db: VersionedKnex) {}

    async getList(
        filters: SharedLibsGetListFilters,
        options: SharedLibsGetListOptions,
    ): Promise<PaginatedResult<SharedLib>> {
        const { db } = this;

        const query = db
            .selectVersionedRows(Tables.SharedLibs, 'name', EntityTypes.shared_libs, [`${Tables.SharedLibs}.*`])
            .from(Tables.SharedLibs);

        if (filters?.name) {
            query.whereLike(`${Tables.SharedLibs}.name`, `%${filters.name}%`);
        }

        const sharedLibs = await query.range(options.range as string | undefined);
        const itemsWithId = sharedLibs.data.map((item: any) => {
            return { ...item, versionId: appendDigest(item.versionId, 'sharedLib') };
        });

        return {
            data: itemsWithId,
            pagination: sharedLibs.pagination,
        };
    }
}

// TODO: implement factory and IoC Container
export const sharedLibsRepository = new SharedLibsRepository(db);
