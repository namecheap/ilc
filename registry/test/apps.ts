import _ from 'lodash';
import { request, expect } from './common';

const example = <any>{
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
};
example.encodedName = encodeURIComponent(example.correct.name);

describe(`Tests ${example.url}`, () => {
    before('should work simple "create" and "delete"', async () => {
        await request.post(example.url).send(example.correct).expect(200)
        await request.get(example.url + example.encodedName).expect(200);
        await request.delete(example.url + example.encodedName).expect(204);
        await request.get(example.url + example.encodedName).expect(404);
    });
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
                ssr: 456,
                assetsDiscoveryUrl: 789,
                dependencies: 456,
                props: 789,
                initProps: 456,
            };

            let response = await request.post(example.url)
            .send({
                ...example.correct,
                ...incorrect
            })
            .expect(
                422,
                '"spaBundle" must be a string\n' +
                '"cssBundle" must be a string\n' +
                '"assetsDiscoveryUrl" must be a string\n' +
                '"dependencies" must be of type object\n' +
                '"props" must be of type object\n' +
                '"ssr" must be of type object\n' +
                '"initProps" must be of type object\n' +
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
            .expect(200)

            expect(response.body).deep.equal(example.correct);

            response = await request.get(example.url + example.encodedName)
            .expect(200);

            expect(response.body).deep.equal(example.correct);
        });
    });

    describe('Read', () => {
        it('should not return record with id which not exists', async () => {
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

            await request.delete(example.url + example.encodedName);
        });

        it('should successfully return all existed records', async () => {
            await request.post(example.url).send(example.correct);

            const response = await request.get(example.url)
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);

            await request.delete(example.url + example.encodedName);
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
            await request.post(example.url).send(example.correct);

            const response = await request.put(example.url + example.encodedName)
            .send(example.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});

            await request.delete(example.url + example.encodedName);
        });

        it('should not update record with incorrect type of fields', async () => {
            await request.post(example.url).send(example.correct);

            const incorrect = {
                spaBundle: 456,
                cssBundle: 789,
                ssr: 456,
                assetsDiscoveryUrl: 789,
                dependencies: 456,
                props: 789,
                initProps: 456,
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
                '"ssr" must be of type object\n' +
                '"initProps" must be of type object'
            );
            expect(response.body).deep.equal({});

            await request.delete(example.url + example.encodedName);
        });

        it('should successfully update record', async () => {
            await request.post(example.url).send(example.correct);

            const response = await request.put(example.url + example.encodedName)
            .send(_.omit(example.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(example.updated);

            await request.delete(example.url + example.encodedName);
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
            await request.post(example.url).send(example.correct);

            const response = await request.delete(example.url + example.encodedName)
            .expect(204, '');

            expect(response.body).deep.equal({});

            await request.delete(example.url + example.encodedName);
        });
    });
});
