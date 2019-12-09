const _ = require('lodash');
const { expect } = require('chai');

const example = {
    url: '/api/v1/app/',
    correct: Object.freeze({
        name: '@portal/ncTestAppReactssr',
        spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
        ssr: {
            src: "http://127.0.0.1:1234/fragment",
            timeout: 1000,
            primary: true
        },
        assetsDiscoveryUrl: 'http://127.0.0.1:1234/_spa/dev/assets-discovery',
        // dependencies: {},
        // props: {},
        // initProps: {},
    }),
    incorrect: Object.freeze({
        name: 123,
        spaBundle: 456,
        cssBundle: 789,
        ssr: 456,
        assetsDiscoveryUrl: 789,
        dependencies: 456,
        props: 789,
        initProps: 456,
    }),
    updated: Object.freeze({
        name: '@portal/ncTestAppReactssr',
        spaBundle: 'http://localhost:1234/ncTestAppReactssrUpdated.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssrUpdated.css',
        ssr: {
            src: "http://127.0.0.1:1234/fragmentUpdated",
            timeout: 2000,
            primary: false,
        },
        assetsDiscoveryUrl: 'http://127.0.0.1:1234/_spa/dev/assets-discoveryUpdated',
        dependencies: {
            react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
            'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
        },
        props: {
            fragmentModuleName: 'reactssr-app-mainUpdated',
            assetsPath: 'http://127.0.0.1:3001/uisamplereactUpdated',
            locationStrategy: 'browserHistoryUpdated',
        },
        initProps: {
            assetsPath: 'http://127.0.0.1:3001/uisamplereact',
        },
    }),

    create: async () => {
        await request.post(example.url).send(example.correct);
    },
    delete: async () => {
        await request.delete(example.url + example.encodedName);
    },
};
example.encodedName = encodeURIComponent(example.correct.name);

describe(`Tests ${example.url}`, () => {
    before('should work simple "create" and "delete"', async () => {
        await request.post(example.url).send(example.correct).expect(200)
        await request.get(example.url + example.encodedName).expect(200);
        await request.delete(example.url + example.encodedName).expect(204);
        await request.get(example.url + example.encodedName).expect(404);
    });
    afterEach(example.delete);
    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'name'))
            .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: spaBundle', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'spaBundle'))
            .expect(422, '"spaBundle" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                name: example.incorrect.name
            })
            .expect(422, '"name" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: spaBundle', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                spaBundle: example.incorrect.spaBundle
            })
            .expect(422, '"spaBundle" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: cssBundle', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                cssBundle: example.incorrect.cssBundle
            })
            .expect(422, '"cssBundle" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: ssr', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                ssr: example.incorrect.ssr
            })
            .expect(422, '"ssr" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: assetsDiscoveryUrl', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                assetsDiscoveryUrl: example.incorrect.assetsDiscoveryUrl
            })
            .expect(422, '"assetsDiscoveryUrl" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: dependencies', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                dependencies: example.incorrect.dependencies
            })
            .expect(422, '"dependencies" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: props', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                props: example.incorrect.props
            })
            .expect(422, '"props" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: initProps', async () => {
            let response = await request.post(example.url)
            .send({
                ...example.correct,
                initProps: example.incorrect.initProps
            })
            .expect(422, '"initProps" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.encodedName)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
            .send(example.correct)
            .expect(200)

            expect(response.body).deep.equal(example.correct);

            response = await request.get(example.url + example.encodedName)
            .expect(200);

            expect(response.body).deep.equal(example.correct);
        });
    });

    describe('Read', () => {
        it('should not return record with id which not exists', async () => {
            const response = await request.get(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await example.create();

            const response = await request.get(example.url + example.encodedName)
            .expect(200);

            expect(response.body).deep.equal(example.correct);
        });

        it('should successfully return all existed records', async () => {
            await example.create();

            const response = await request.get(example.url)
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send(example.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: spaBundle', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                spaBundle: example.incorrect.spaBundle
            })
            .expect(422, '"spaBundle" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: cssBundle', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                cssBundle: example.incorrect.cssBundle
            })
            .expect(422, '"cssBundle" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: ssr', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                ssr: example.incorrect.ssr
            })
            .expect(422, '"ssr" must be of type object');
            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: assetsDiscoveryUrl', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                assetsDiscoveryUrl: example.incorrect.assetsDiscoveryUrl
            })
            .expect(422, '"assetsDiscoveryUrl" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: dependencies', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                dependencies: example.incorrect.dependencies
            })
            .expect(422, '"dependencies" must be of type object');
            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: props', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                props: example.incorrect.props
            })
            .expect(422, '"props" must be of type object');
            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: initProps', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send({
                ..._.omit(example.updated, 'name'),
                initProps: example.incorrect.initProps
            })
            .expect(422, '"initProps" must be of type object');
            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await example.create();

            const response = await request.put(example.url + example.encodedName)
            .send(_.omit(example.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(example.updated);
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(example.url + encodeURIComponent(example.incorrect.name))
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await example.create();

            const response = await request.delete(example.url + example.encodedName)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
