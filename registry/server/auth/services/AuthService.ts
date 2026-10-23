import * as bcrypt from 'bcrypt';
import { User } from '../../../typings/User';
import { AuthProviders } from '../../authEntities/interfaces';
import type { Knex } from 'knex';
import db from '../../db';

export class AuthService {
    constructor(private readonly db: Knex) {}

    public async getAuthEntity(
        provider: AuthProviders,
        identifier: string,
        secret: string | null,
    ): Promise<User | null> {
        const user = await this.db
            .select()
            .from('auth_entities')
            .first('identifier', 'id', 'role', 'secret')
            .where({
                provider,
            })
            .andWhereRaw('LOWER(identifier) = LOWER(?)', [identifier]);

        if (!user) {
            return null;
        }

        if (user.secret === null && secret !== null) {
            return null;
        }

        if (user.secret !== null && secret !== null) {
            //Support of the password less auth methods, like OpenID Connect
            if (!(await bcrypt.compare(secret, user.secret))) {
                return null;
            }
        }

        return {
            authEntityId: user.id,
            identifier: user.identifier,
            role: user.role,
        };
    }
}

export const authService = new AuthService(db);
