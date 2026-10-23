import * as bcrypt from 'bcrypt';

import type { User } from '../../../typings/User';
import { NotFoundError } from '../../errorHandler/httpErrors';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { AuthEntityRow, CreateAuthEntityInput, UpdateAuthEntityInput } from '../interfaces';
import type { AuthEntitiesRepository } from '../repositories/AuthEntitiesRepository';

export class AuthEntitiesService {
    constructor(
        private readonly repository: AuthEntitiesRepository,
        private readonly versioning: Versioning,
    ) {}

    list(): Promise<VersionedRecord<AuthEntityRow>[]> {
        return this.repository.list();
    }

    get(id: number): Promise<VersionedRecord<AuthEntityRow> | undefined> {
        return this.repository.findById(id);
    }

    async create(authEntity: CreateAuthEntityInput, user: User | undefined): Promise<AuthEntityRow> {
        const toSave = await withHashedSecret(authEntity);

        return this.versioning.withVersion(user, { type: EntityTypes.auth_entities }, (trx) =>
            this.repository.insert(toSave, trx),
        );
    }

    async update(id: number, authEntity: UpdateAuthEntityInput, user: User | undefined): Promise<AuthEntityRow> {
        const toSave = await withHashedSecret(authEntity);

        return this.versioning.withVersion(user, { type: EntityTypes.auth_entities, id }, async (trx) => {
            const updated = await this.repository.update(id, toSave, trx);
            if (!updated) {
                throw new NotFoundError();
            }
            return updated;
        });
    }

    async delete(id: number, user: User | undefined): Promise<void> {
        await this.versioning.withVersion(user, { type: EntityTypes.auth_entities, id }, async (trx) => {
            const count = await this.repository.delete(id, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }
}

async function withHashedSecret<T extends { secret?: string }>(authEntity: T): Promise<T> {
    if (!authEntity.secret) {
        return authEntity;
    }
    return { ...authEntity, secret: await bcrypt.hash(authEntity.secret, await bcrypt.genSalt()) };
}
