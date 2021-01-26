import nock from 'nock';
import _ from 'lodash';
import { request, requestWithAuth, expect } from './common';

const assetsDiscovery = {
    host: 'http://127.0.0.1:1234',
    path: '/_spa/dev/assets-discovery',
};

const assetsDiscoveryUrl = assetsDiscovery.host + assetsDiscovery.path;

const correct = Object.freeze({
    name: '@portal/ncTestAppReactssr',
    spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
    cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
    configSelector: ['ncTestSharedPropsName'],
    ssr: {
        src: "http://127.0.0.1:1234/fragment",
        timeout: 1000,
    },
    kind: 'primary',
    // dependencies: {},
    // props: {},
});

const example = <any>{
    url: '/api/v1/app/',
    assetsDiscovery,
    manifest: {
        spaBundle: 'http://127.0.0.1:8239/dist/single_spa.js',
        cssBundle: 'http://127.0.0.1:8239/dist/common.6c686c02a026a4af4016.css',
    },
    correct,
    correctWithAssetsDiscoveryUrl: Object.freeze({
        ...correct,
        assetsDiscoveryUrl,
    }),
    updated: Object.freeze({
        name: '@portal/ncTestAppReactssr',
        spaBundle: 'http://localhost:1234/ncTestAppReactssrUpdated.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssrUpdated.css',
        configSelector: ['ncTestSharedPropsNameUpdated'],
        ssr: {
            src: "http://127.0.0.1:1234/fragmentUpdated",
            timeout: 2000,
        },
        kind: 'regular',
        dependencies: {
            react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
            'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
        },
        props: {
            fragmentModuleName: 'reactssr-app-mainUpdated',
            assetsPath: 'http://127.0.0.1:3001/uisamplereactUpdated',
            locationStrategy: 'browserHistoryUpdated',
        },
    }),
};
example.encodedName = encodeURIComponent(example.correct.name);

describe(`Tests ${example.url}`, () => {
    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, ['name', 'spaBundle']))
            .expect(422, '"spaBundle" is required\n"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of fields', async () => {
            const incorrect = {
                name: 123,
                spaBundle: 456,
                cssBundle: 789,
                configSelector: 654,
                ssr: 456,
                assetsDiscoveryUrl: 789,
                dependencies: 456,
                props: 789,
            };

            let response = await request.post(example.url)
            .send({
                ...example.correct,
                ...incorrect
            })
            .expect(
                422,
                '"cssBundle" must be a string\n' +
                '"assetsDiscoveryUrl" must be a string\n' +
                '"spaBundle" must be a string\n' +
                '"dependencies" must be of type object\n' +
                '"props" must be of type object\n' +
                '"configSelector" must be an array\n' +
                '"ssr" must be of type object\n' +
                '"name" must be a string'
                );

            expect(response.body).deep.equal({});

            response = await request.get(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
            .send(example.correct)
            .expect(200);

            expect(response.body).deep.equal(example.correct);

            response = await request.get(example.url + example.encodedName)
            .expect(200);

            expect(response.body).deep.equal(example.correct);

            await request.delete(example.url + example.encodedName).expect(204);
        });

        it('should not create a record when a manifest file can not be fetched', async () => {
            try {
                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(404);

                const response = await request
                    .post(example.url)
                    .send(example.correctWithAssetsDiscoveryUrl)
                    .expect(422, `"spaBundle" can not be taken from a manifest file by provided "assetsDiscoveryUrl"`);

                expect(response.body).deep.equal({});
            } finally {
                await request.delete(example.url + example.encodedName).expect(404);
            }
        });

        it('should not create a record when a SPA bundle URL was not specified in a manifest file', async () => {
            try {
                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(200, JSON.stringify({}));

                const response = await request
                    .post(example.url)
                    .send(example.correctWithAssetsDiscoveryUrl)
                    .expect(422, `"spaBundle" must be specified in the manifest file from provided "assetsDiscoveryUrl" if it was not specified manually`);

                expect(response.body).deep.equal({});
            } finally {
                await request.delete(example.url + example.encodedName).expect(404);
            }
        });

        it('should create a record when a SPA bundle URL was specified in a manifest file', async () => {
            try {
                const scope = nock(example.assetsDiscovery.host);
                scope.log(console.log).get(example.assetsDiscovery.path).delay(0).reply(200, JSON.stringify(example.manifest));

                const response = await request.post(example.url).send(example.correctWithAssetsDiscoveryUrl).expect(200);
                expect(response.body).deep.equal({
                    ...example.correctWithAssetsDiscoveryUrl,
                    ...example.manifest,
                });
            } finally {
                await request.delete(example.url + example.encodedName).expect(204);
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
            const incorrect = { name: 123 };
            const response = await request.get(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await request.post(example.url).send(example.correct);

            const response = await request.get(example.url + example.encodedName)
            .expect(200);

            expect(response.body).deep.equal(example.correct);

            await request.delete(example.url + example.encodedName).expect(204);
        });

        it('should successfully return all existed records', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.get(example.url)
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);

            await request.delete(example.url + example.encodedName).expect(204);
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
            const incorrect = { name: 123 };
            const response = await request.put(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.put(example.url + example.encodedName)
            .send(example.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});

            await request.delete(example.url + example.encodedName).expect(204);
        });

        it('should not update record with incorrect type of fields', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const incorrect = {
                spaBundle: 456,
                cssBundle: 789,
                configSelector: 654,
                ssr: 456,
                assetsDiscoveryUrl: 789,
                dependencies: 456,
                props: 789,
                kind: 'origin',
            };

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                ...incorrect,
            })
            .expect(
                422,
                '"spaBundle" must be a string\n' +
                '"cssBundle" must be a string\n' +
                '"assetsDiscoveryUrl" must be a string\n' +
                '"dependencies" must be of type object\n' +
                '"props" must be of type object\n' +
                '"configSelector" must be an array\n' +
                '"ssr" must be of type object\n' +
                '"kind" must be one of [primary, essential, regular, wrapper]'
            );
            expect(response.body).deep.equal({});

            await request.delete(example.url + example.encodedName).expect(204);
        });

        it('should successfully update record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.put(example.url + example.encodedName)
            .send(_.omit(example.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(example.updated);

            await request.delete(example.url + example.encodedName).expect(204);
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.put(example.url + 123)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const incorrect = { name: 123 };
            const response = await request.delete(example.url + encodeURIComponent(incorrect.name))
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.delete(example.url + example.encodedName)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.delete(example.url + 123)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });
});
