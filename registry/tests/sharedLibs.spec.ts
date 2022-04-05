import nock from 'nock';
import _ from 'lodash';
import { request, requestWithAuth, expect } from './common';
import { muteConsole, unmuteConsole } from './utils/console';
import supertest from 'supertest';

const example = <any>{
    url: '/api/v1/shared_libs/',
    assetsDiscovery: {
        host: 'http://127.0.0.1:1234',
        path: '/_spa/dev/assets-discovery',
    },
    manifest: {
        spaBundle: 'http://127.0.0.1:8239/dist/single_spa.js',
    },
    correct: Object.freeze({
        name: 'testNameSharedLib',
        spaBundle: 'http://localhost:1234/testSpaBundleSharedLib.js',
        adminNotes: 'Lorem ipsum admin notes dolor sit',
    }),
    updated: Object.freeze({
        name: 'testNameSharedLib',
        spaBundle: 'http://localhost:1234/testSpaBundleSharedLibUPDATED.js',
        adminNotes: 'Lorem ipsum admin notes dolor sit UPDATED',
    }),
};

example.correctWithAssetsDiscoveryUrl = Object.freeze({
    ...example.correct,
    assetsDiscoveryUrl: example.assetsDiscovery.host + example.assetsDiscovery.path,
});

describe(`Tests ${example.url}`, () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
    })

    describe('Create', () => {
        it('should not create record without a required fields', async () => {
            const response = await req.post(example.url)
            .send(_.omit(example.correct, ['name', 'spaBundle']))
            .expect(422, '"spaBundle" is required\n"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of fields', async () => {
            const incorrect = {
                name: 111,
                spaBundle: 222,
                assetsDiscoveryUrl: 333,
                adminNotes: 444,
            };

            let response = await req.post(example.url)
            .send({
                ...example.correct,
                ...incorrect
            })
            .expect(
                422,
                '"assetsDiscoveryUrl" must be a string\n' +
                '"spaBundle" must be a string\n' +
                '"adminNotes" must be a string\n' +
                '"name" must be a string'
                );

            expect(response.body).deep.equal({});

            response = await req.get(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            try {
                let response = await req.post(example.url)
                    .send(example.correct)
                    .expect(200);

                expect(response.body).deep.equal(example.correct);

                response = await req.get(example.url + example.correct.name)
                    .expect(200);

                expect(response.body).deep.equal(example.correct);
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should not create a record when a manifest file can not be fetched', async () => {
            muteConsole();

            try {
                const scope = nock(example.assetsDiscovery.host);
                scope.get(example.assetsDiscovery.path).delay(0).reply(404);

                const response = await req
                    .post(example.url)
                    .send(example.correctWithAssetsDiscoveryUrl)
                    .expect(422, `"assetsDiscoveryUrl" is not available. Check the url via browser manually.`);

                expect(response.body).deep.equal({});
            } finally {
                unmuteConsole();
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should not create a record when a SPA bundle URL was not specified in a manifest file', async () => {
            try {
                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(200, JSON.stringify({}));

                const response = await req
                    .post(example.url)
                    .send(example.correctWithAssetsDiscoveryUrl)
                    .expect(422, `"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually`);

                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should create a record when a SPA bundle URL was specified in a manifest file', async () => {
            try {
                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(200, JSON.stringify(example.manifest));

                const response = await req.post(example.url).send(example.correctWithAssetsDiscoveryUrl);

                expect(response.body).deep.equal({
                    ...example.correctWithAssetsDiscoveryUrl,
                    ...example.manifest,
                });
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.post(example.url)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing "name"', async () => {
            const incorrect = { name: 123 };
            const response = await req.get(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            try {
                await req.post(example.url).send(example.correct);

                const response = await req.get(example.url + example.correct.name)
                    .expect(200);

                expect(response.body).deep.equal(example.correct);
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should successfully return all existed records', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const response = await req.get(example.url)
                    .expect(200);

                expect(response.body).to.be.an('array').that.is.not.empty;
                expect(response.body).to.deep.include(example.correct);
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.get(example.url)
                    .expect(401);

                await reqWithAuth.get(example.url + 123)
                    .expect(401);
            });
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            const response = await req.put(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const response = await req.put(example.url + example.correct.name)
                    .send(example.updated)
                    .expect(422, '"name" is not allowed');

                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should not update record with incorrect type of fields', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const incorrect = {
                    spaBundle: 456,
                    assetsDiscoveryUrl: 789,
                    adminNotes: 222,
                };

                const response = await req.put(example.url + example.correct.name)
                    .send({
                        ..._.omit(example.updated, 'name'),
                        ...incorrect,
                    })
                    .expect(
                        422,
                        '"spaBundle" must be a string\n' +
                        '"assetsDiscoveryUrl" must be a string\n' +
                        '"adminNotes" must be a string'
                    );
                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should successfully update record', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const response = await req.put(example.url + example.correct.name)
                    .send(_.omit(example.updated, 'name'))
                    .expect(200);

                expect(response.body).deep.equal(example.updated);
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should not update a record when a manifest file can not be fetched', async () => {
            muteConsole();

            try {
                await req.post(example.url).send(example.correct).expect(200);

                const scope = nock(example.assetsDiscovery.host);
                scope.get(example.assetsDiscovery.path).delay(0).reply(404);

                const response = await req.put(example.url + example.correct.name)
                    .send(_.omit(example.correctWithAssetsDiscoveryUrl, 'name'))
                    .expect(422, `"assetsDiscoveryUrl" is not available. Check the url via browser manually.`);

                expect(response.body).deep.equal({});
            } finally {
                unmuteConsole();
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should not update a record when a SPA bundle URL was not specified in a manifest file', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(200, JSON.stringify({}));

                const response = await req.put(example.url + example.correct.name)
                    .send(_.omit(example.correctWithAssetsDiscoveryUrl, 'name'))
                    .expect(422, `"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually`);

                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should update a record when a SPA bundle URL was specified in a manifest file', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(200, JSON.stringify(example.manifest));

                const response = await req.put(example.url + example.correct.name)
                    .send(_.omit(example.correctWithAssetsDiscoveryUrl, 'name'));

                expect(response.body).deep.equal({
                    ...example.correctWithAssetsDiscoveryUrl,
                    ...example.manifest,
                });
            } finally {
                await req.delete(example.url + example.correct.name);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.put(example.url + 123)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            const response = await req.delete(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.delete(example.url + example.correct.name)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.delete(example.url + 123)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });
});
