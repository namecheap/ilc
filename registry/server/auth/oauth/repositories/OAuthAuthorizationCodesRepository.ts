import type { Knex } from 'knex';
import { Tables } from '../../../db/structure';
import type { OAuthAuthorizationCodeRow } from '../interfaces';

export type NewOAuthAuthorizationCode = Omit<OAuthAuthorizationCodeRow, 'used' | 'createdAt'>;

export class OAuthAuthorizationCodesRepository {
    constructor(private readonly db: Knex) {}

    async create(code: NewOAuthAuthorizationCode): Promise<void> {
        await this.db(Tables.OAuthAuthorizationCodes).insert(code);
    }

    /**
     * Marks the code used and returns it. The update is the check, so a code presented twice at once is consumed
     * once. Undefined when the code does not exist or was used already.
     */
    async consume(codeHash: string): Promise<OAuthAuthorizationCodeRow | undefined> {
        const [row] = await this.db(Tables.OAuthAuthorizationCodes)
            .where({ codeHash, used: false })
            .update({ used: true })
            .returning('*');
        return row;
    }

    async deleteExpired(now: Date): Promise<void> {
        await this.db(Tables.OAuthAuthorizationCodes).where('expiresAt', '<', now).delete();
    }
}
