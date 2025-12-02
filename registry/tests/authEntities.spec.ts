import _ from 'lodash';
import { type Agent } from 'supertest';
import { expect, request, requestWithAuth } from './common';

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
        role: 'readonly',
    }),
};

describe(`Tests ${example.url}`, () => {
    let req: Agent;

    beforeEach(async () => {
        req = await request();
    });

    describe('Create', () => {
        it('should not create record without a required fields', async () => {
            await req
                .post(example.url)
                .send(_.omit(example.correct, ['identifier', 'provider', 'role']))
                .expect(422, '"identifier" is required\n"provider" is required\n"role" is required');
        });

        it('should not create record with incorrect type of fields', async () => {
            const expectedErr =
                `"identifier" must be a string\n` +
                `"secret" must be a string\n` +
                `"provider" must be one of [local, bearer, openid]\n` +
                `"role" must be one of [admin, readonly]`;

            const incorrect = {
                identifier: 123,
                secret: 456,
                provider: 'invalid',
                role: 'invalid',
            };

            await req.post(example.url).send(incorrect).expect(422, expectedErr);
        });

        it('should successfully create record', async () => {
            let authEntityId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                authEntityId = response.body.id;

                const expectedRes = _.omit(Object.assign({ id: authEntityId }, example.correct), ['secret']);

                expect(response.body).deep.equal(expectedRes);

                response = await req.get(example.url + authEntityId).expect(200);

                expect(response.body).deep.equal({ ...expectedRes, versionId: response.body.versionId });
            } finally {
                authEntityId && (await req.delete(example.url + authEntityId));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) => r.post(example.url).send(example.correct).expect(401));
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            await req.get(example.url + 123).expect(404, 'Not found');
        });

        it('should successfully return record', async () => {
            let authEntityId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                authEntityId = response.body.id;

                response = await req.get(example.url + authEntityId).expect(200);

                expect(response.body.versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                const expectedRes = _.omit(Object.assign({ id: authEntityId }, example.correct), ['secret']);

                expect(response.body).deep.equal({ ...expectedRes, versionId: response.body.versionId });
            } finally {
                authEntityId && (await req.delete(example.url + authEntityId));
            }
        });

        it('should successfully return all existed records', async () => {
            let authEntityId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                authEntityId = response.body.id;

                response = await req.get(example.url).expect(200);

                const expectedRes = _.omit(Object.assign({ id: authEntityId }, example.correct), ['secret']);

                expect(response.body).to.be.an('array').that.is.not.empty;
                expect(response.body).to.have.lengthOf(5);
                expect(response.body[0].versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                response.body.forEach((item: any) => {
                    delete item.versionId;
                });

                expect(response.body).to.deep.include({ ...expectedRes });
            } finally {
                authEntityId && (await req.delete(example.url + authEntityId));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) => r.get(example.url).expect(401));

                await requestWithAuth().then((r) => r.get(example.url + 123).expect(401));
            });
        });
    });

    describe('Update', () => {
        it('should respond with 400 on missing body', async () => {
            await req.put(example.url + 123).expect(400, 'Missing body in request');
        });
        it("should not update any record if record doesn't exist", async () => {
            await req
                .put(example.url + 123)
                .send(_.omit(example.updated, 'name'))
                .expect(404, 'Not found');
        });

        it('should successfully update record', async () => {
            let authEntityId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                authEntityId = response.body.id;

                response = await req
                    .put(example.url + authEntityId)
                    .send(example.updated)
                    .expect(200);

                const expectedRes = _.omit(
                    Object.assign({}, example.correct, {
                        id: authEntityId,
                        role: example.updated.role,
                    }),
                    ['secret'],
                );
                expect(response.body).deep.equal(expectedRes);
            } finally {
                authEntityId && (await req.delete(example.url + authEntityId));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) =>
                    r
                        .put(example.url + 123)
                        .send(_.omit(example.updated, 'name'))
                        .expect(401),
                );
            });
        });
    });

    describe('Delete', () => {
        it("should not delete any record if record doesn't exist", async () => {
            await req.delete(example.url + 123).expect(404, 'Not found');
        });

        it('should successfully delete record', async () => {
            let response = await req.post(example.url).send(example.correct).expect(200);
            const recId = response.body.id;

            await req.delete(example.url + recId).expect(204, '');

            await req.get(example.url + recId).expect(404);
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) => r.delete(example.url + 123).expect(401));
            });
        });
    });
});
