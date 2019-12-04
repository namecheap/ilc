const _ = require('lodash');
const { expect } = require('chai');

const examples = {
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
        await request.post('/api/v1/app').send(examples.correct);
    },
    delete: async () => {
        await request.delete(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`);
    },
};

describe('Tests /api/v1/app', () => {
    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await request.post('/api/v1/app')
            .send(_.omit(examples.correct, 'name'))
            .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: spaBundle', async () => {
            const response = await request.post('/api/v1/app')
            .send(_.omit(examples.correct, 'spaBundle'))
            .expect(422, '"spaBundle" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                name: examples.incorrect.name
            })
            .expect(422, '"name" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: spaBundle', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                spaBundle: examples.incorrect.spaBundle
            })
            .expect(422, '"spaBundle" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: cssBundle', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                cssBundle: examples.incorrect.cssBundle
            })
            .expect(422, '"cssBundle" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: ssr', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                ssr: examples.incorrect.ssr
            })
            .expect(422, '"ssr" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: assetsDiscoveryUrl', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                assetsDiscoveryUrl: examples.incorrect.assetsDiscoveryUrl
            })
            .expect(422, '"assetsDiscoveryUrl" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: dependencies', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                dependencies: examples.incorrect.dependencies
            })
            .expect(422, '"dependencies" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: props', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                props: examples.incorrect.props
            })
            .expect(422, '"props" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: initProps', async () => {
            let response = await request.post('/api/v1/app')
            .send({
                ...examples.correct,
                initProps: examples.incorrect.initProps
            })
            .expect(422, '"initProps" must be of type object');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post('/api/v1/app')
            .send(examples.correct)
            .expect(200)

            expect(response.body).deep.equal(examples.correct);

            response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(200);

            expect(response.body).deep.equal(examples.correct);

            await examples.delete();
        });
    });

    describe('Read', () => {
        it('should not return record with id which not exists', async () => {
            const response = await request.get(`/api/v1/app/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await examples.create();

            const response = await request.get(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(200);

            expect(response.body).deep.equal(examples.correct);

            await examples.delete();
        });

        it('should successfully return all existed records', async () => {
            await examples.create();

            const response = await request.get('/api/v1/app/')
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(examples.correct);

            await examples.delete();
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(`/api/v1/app/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send(examples.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: spaBundle', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                spaBundle: examples.incorrect.spaBundle
            })
            .expect(422, '"spaBundle" must be a string');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: cssBundle', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                cssBundle: examples.incorrect.cssBundle
            })
            .expect(422, '"cssBundle" must be a string');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: ssr', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                ssr: examples.incorrect.ssr
            })
            .expect(422, '"ssr" must be of type object');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: assetsDiscoveryUrl', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                assetsDiscoveryUrl: examples.incorrect.assetsDiscoveryUrl
            })
            .expect(422, '"assetsDiscoveryUrl" must be a string');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: dependencies', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                dependencies: examples.incorrect.dependencies
            })
            .expect(422, '"dependencies" must be of type object');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: props', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                props: examples.incorrect.props
            })
            .expect(422, '"props" must be of type object');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should not update record with incorrect type of field: initProps', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send({
                ..._.omit(examples.updated, 'name'),
                initProps: examples.incorrect.initProps
            })
            .expect(422, '"initProps" must be of type object');
            expect(response.body).deep.equal({});

            await examples.delete();
        });

        it('should successfully update record', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .send(_.omit(examples.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(examples.updated);

            await examples.delete();
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(`/api/v1/app/${encodeURIComponent(examples.incorrect.name)}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await examples.create();

            const response = await request.delete(`/api/v1/app/${encodeURIComponent(examples.correct.name)}`)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
