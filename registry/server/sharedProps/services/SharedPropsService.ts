import type { User } from '../../../typings/User';
import { NotFoundError } from '../../errorHandler/httpErrors';
import { defined } from '../../util/helpers';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { CreateSharedPropsInput, SharedPropsRow, UpdateSharedPropsInput } from '../interfaces';
import type { SharedPropsRepository } from '../repositories/SharedPropsRepository';

export class SharedPropsService {
    constructor(
        private readonly repository: SharedPropsRepository,
        private readonly versioning: Versioning,
    ) {}

    list(): Promise<VersionedRecord<SharedPropsRow>[]> {
        return this.repository.list();
    }

    get(name: string): Promise<VersionedRecord<SharedPropsRow> | undefined> {
        return this.repository.findByName(name);
    }

    async create(sharedProps: CreateSharedPropsInput, user: User | undefined): Promise<SharedPropsRow> {
        let created: SharedPropsRow | undefined;

        await this.versioning.logOperation(
            user,
            { type: EntityTypes.shared_props, id: sharedProps.name },
            async (trx) => {
                created = await this.repository.insert(sharedProps, trx);
            },
        );

        return defined(created);
    }

    async update(name: string, sharedProps: UpdateSharedPropsInput, user: User | undefined): Promise<SharedPropsRow> {
        let updated: SharedPropsRow | undefined;

        await this.versioning.logOperation(user, { type: EntityTypes.shared_props, id: name }, async (trx) => {
            updated = await this.repository.update(name, sharedProps, trx);
            if (!updated) {
                throw new NotFoundError();
            }
        });

        return defined(updated);
    }

    async delete(name: string, user: User | undefined): Promise<void> {
        await this.versioning.logOperation(user, { type: EntityTypes.shared_props, id: name }, async (trx) => {
            const count = await this.repository.delete(name, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }
}
