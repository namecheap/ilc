import type { User } from '../../../typings/User';
import type { PaginatedResult } from '../../../typings/PaginatedResult';
import { ConflictError, NotFoundError, UnprocessableContent } from '../../errorHandler/httpErrors';
import { isUniqueConstraintError } from '../../util/db';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { RouterDomainsInput, RouterDomainsRow } from '../interfaces';
import type { RouterDomainsRepository } from '../repositories/RouterDomainsRepository';

export class RouterDomainsService {
    constructor(
        private readonly repository: RouterDomainsRepository,
        private readonly versioning: Versioning,
    ) {}

    list(range: string | undefined): Promise<PaginatedResult<VersionedRecord<RouterDomainsRow>>> {
        return this.repository.list(range);
    }

    get(id: number): Promise<VersionedRecord<RouterDomainsRow> | undefined> {
        return this.repository.findById(id);
    }

    /** The id of the router domain with this alias, a 422 when there is none */
    async getIdByAlias(alias: string): Promise<number> {
        const id = await this.repository.findIdByAlias(alias);
        if (id === undefined) {
            throw new UnprocessableContent({ message: `Router domain with alias "${alias}" does not exist` });
        }
        return id;
    }

    async create(routerDomain: RouterDomainsInput, user: User | undefined): Promise<RouterDomainsRow> {
        try {
            return await this.versioning.withVersion(user, { type: EntityTypes.router_domains }, (trx) =>
                this.repository.insert(routerDomain, trx),
            );
        } catch (e: unknown) {
            throw toDuplicateAliasError(e, routerDomain.alias);
        }
    }

    async update(id: number, routerDomain: RouterDomainsInput, user: User | undefined): Promise<RouterDomainsRow> {
        try {
            return await this.versioning.withVersion(user, { type: EntityTypes.router_domains, id }, async (trx) => {
                const updated = await this.repository.update(id, routerDomain, trx);
                if (!updated) {
                    throw new NotFoundError();
                }
                return updated;
            });
        } catch (e: unknown) {
            throw toDuplicateAliasError(e, routerDomain.alias);
        }
    }

    async delete(id: number, user: User | undefined): Promise<void> {
        await this.versioning.withVersion(user, { type: EntityTypes.router_domains, id }, async (trx) => {
            const references = await this.repository.countReferences(id, trx);

            if (references.routes || references.apps) {
                const usedBy = [
                    references.routes && `${references.routes} route(s)`,
                    references.apps && `${references.apps} app(s) via "enforceDomain"`,
                ]
                    .filter(Boolean)
                    .join(' and ');

                throw new ConflictError({
                    message: `Unable to delete router domain: it is referenced by ${usedBy}. Remove or reassign them first.`,
                });
            }

            const count = await this.repository.delete(id, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }
}

function toDuplicateAliasError(e: unknown, alias: string | null): unknown {
    if (isUniqueConstraintError(e, 'router_domains_alias_unique')) {
        return new UnprocessableContent({ message: `Router domain with alias "${alias}" already exists.` });
    }
    return e;
}
