import _ from 'lodash';
import {request, expect, requestWithAuth} from './common';

const example = {
    url: '/api/v1/auth_entities/',
    correct: Object.freeze({
        identifier: 'user1',
        secret: 'tst',
        provider: 'local',
        role: 'admin',
    }),
    updated: Object.freeze({
        secret: 'tst2',
        role: 'user',
    }),
};

describe(`Tests ${example.url}`, () => {
    describe('Create', () => {
        it('should not create record without a required fields', async () => {
            await request.post(example.url)
                .send(_.omit(example.correct, ['identifier', 'provider', 'role']))
                .expect(422, '"identifier" is required\n"provider" is required\n"role" is required');
        });

        it('should not create record with incorrect type of fields', async () => {
            const expectedErr =
                `"identifier" must be a string\n` +
                `"secret" must be a string\n` +
                `"provider" must be one of [local, bearer, openid]\n` +
                `"role" must be one of [admin, user]`;

            const incorrect = {
                identifier: 123,
                secret: 456,
                provider: 'invalid',
                role: 'invalid',
            };

            await request.post(example.url)
                .send(incorrect)
                .expect(422, expectedErr);
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
                .send(example.correct)
                .expect(200);
            const recId = response.body.id;

            const expectedRes = _.omit(Object.assign({id: recId}, example.correct), ['secret']);

            try {
                expect(response.body).deep.equal(expectedRes);

                response = await request.get(example.url + recId)
                    .expect(200);

                expect(response.body).deep.equal(expectedRes);
            } finally {
                await request.delete(example.url + recId).expect(204, '');
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.post(example.url)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            await request.get(example.url + 123)
            .expect(404, 'Not found');
        });

        it('should successfully return record', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const recId = response.body.id;

            try {
                response = await request.get(example.url + recId)
                    .expect(200);

                const expectedRes = _.omit(Object.assign({id: recId}, example.correct), ['secret']);

                expect(response.body).deep.equal(expectedRes);
            } finally {
                await request.delete(example.url + recId).expect(204, '');
            }
        });

        it('should successfully return all existed records', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const recId = response.body.id;

            try {
                response = await request.get(example.url)
                    .expect(200);

                const expectedRes = _.omit(Object.assign({id: recId}, example.correct), ['secret']);

                expect(response.body).to.be.an('array').that.is.not.empty;
                expect(response.body).to.deep.include(expectedRes);
            } finally {
                await request.delete(example.url + recId).expect(204, '');
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.get(example.url)
                    .expect(401);

                await requestWithAuth.get(example.url + 123)
                    .expect(401);
            });
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            await request.put(example.url + 123)
                .expect(404, 'Not found');
        });

        it('should successfully update record', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const recId = response.body.id;

            try {
                response = await request.put(example.url + recId)
                    .send(example.updated)
                    .expect(200);

                const expectedRes = _.omit(Object.assign({}, example.correct, {id: recId, role: example.updated.role}), ['secret']);
                expect(response.body).deep.equal(expectedRes);
            } finally {
                await request.delete(example.url + recId).expect(204, '');
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.put(example.url + 123)
                    .send(_.omit(example.updated, 'name'))
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            await request.delete(example.url + 123)
                .expect(404, 'Not found');
        });

        it('should successfully delete record', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const recId = response.body.id;

            await request.delete(example.url + recId)
                .expect(204, '');

            await request.get(example.url + recId)
                .expect(404);
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.delete(example.url + 123)
                    .expect(401);
            });
        });
    });
});
