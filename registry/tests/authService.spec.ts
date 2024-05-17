import bcrypt from 'bcrypt';
import { expect } from 'chai';

import { AuthService } from '../server/auth/services/AuthService';
import { AuthProviders } from '../server/authEntities/interfaces';
import db from '../server/db';
import { extractInsertedId } from '../server/util/db';
import { EntityTypes } from '../server/versioning/interfaces';

describe('AuthService', () => {
    let authService: AuthService;

    const provider = 'testProvider' as AuthProviders;

    before(() => {
        authService = new AuthService(db);
    });

    after(async () => {
        await db(EntityTypes.auth_entities).delete().where('provider', provider);
    });

    describe('getAuthEntity', () => {
        it('should return null when user not found', async () => {
            const user = await authService.getAuthEntity(provider, 'nonexistent', 'secret');
            expect(user).to.be.null;
        });

        it('should return user when found and secret matches', async () => {
            const testUser = {
                provider: 'testProvider',
                identifier: 'existing_user@example.com',
                secret: await bcrypt.hash('password', 10), // Hash the password for comparison
                role: 'admin',
            };
            const insertedUser = await db(EntityTypes.auth_entities).insert(testUser).returning('id');

            const user = await authService.getAuthEntity(provider, 'existing_user@example.com', 'password');
            expect(user).to.deep.equal({
                authEntityId: extractInsertedId(insertedUser),
                identifier: testUser.identifier,
                role: testUser.role,
            });
        });

        it('should return null when secret does not match', async () => {
            const testUser = {
                provider: 'testProvider',
                identifier: 'user_with_wrong_secret@example.com',
                secret: await bcrypt.hash('password', 10), // Hash the password for comparison
            };
            await db(EntityTypes.auth_entities).insert(testUser);

            const user = await authService.getAuthEntity(
                provider,
                'user_with_wrong_secret@example.com',
                'wrong_password',
            );
            expect(user).to.be.null;
        });

        it('should return user when secret is null in database', async () => {
            const testUser = {
                provider: 'testProvider',
                identifier: 'user_with_null_secret@example.com',
                secret: null,
                role: 'admin',
            };
            const insertedUser = await db(EntityTypes.auth_entities).insert(testUser).returning('id');

            const user = await authService.getAuthEntity(provider, 'user_with_null_secret@example.com', null);
            expect(user).to.deep.equal({
                authEntityId: extractInsertedId(insertedUser),
                identifier: testUser.identifier,
                role: testUser.role,
            });
        });

        it('should return null when secret is null in database and input secret is not null', async () => {
            const user = await authService.getAuthEntity(provider, 'user_with_null_secret@example.com', 'password');
            expect(user).to.be.null;
        });
    });
});
