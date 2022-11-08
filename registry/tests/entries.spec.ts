import supertest from 'supertest';
import { expect, request, requestWithAuth } from './common';
import * as querystring from 'querystring';
import _ from 'lodash';

const example = <any>{
    url: `/api/v1/entries/${querystring.escape('@sharedLibrary/testNameSharedLibEntry')}`,
    appUrl: `/api/v1/entries/${querystring.escape('@portal/TestAppReactssrEntry')}`,
    incorrectUrl: '/api/v1/entries/123',
    urlSharedLib: '/api/v1/shared_libs/',
    urlApp: '/api/v1/app/',
    assetsDiscovery: {
        host: 'http://127.0.0.1:1234',
        path: '/_spa/dev/assets-discovery',
    },
    manifest: {
        spaBundle: 'http://127.0.0.1:8239/dist/single_spa.js',
    },
    correct: Object.freeze({
        name: 'testNameSharedLibEntry',
        spaBundle: 'http://localhost:1234/testSpaBundleSharedLib.js',
        adminNotes: 'Lorem ipsum admin notes dolor sit',
    }),
    correctApp: {
        name: '@portal/TestAppReactssrEntry',
        spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
        l10nManifest: 'https://localisation.com/manifest.12345678.json',
        configSelector: ['ncTestSharedPropsName'],
        ssr: {
            src: 'http://127.0.0.1:1234/fragment',
            timeout: 1000,
        },
        kind: 'primary',
        // dependencies: {},
        // props: {},
        discoveryMetadata: {
            foo: 'foo1',
            bar: 'bar1',
        },
        adminNotes: 'Lorem ipsum',
    },
    updated: Object.freeze({
        name: 'testNameSharedLibEntry',
        spaBundle: 'http://localhost:1234/testSpaBundleSharedLibUPDATED.js',
        adminNotes: 'Lorem ipsum admin notes dolor sit UPDATED',
    }),
};

example.encodedAppName = encodeURIComponent(example.correctApp.name);

describe(`Entries`, () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
    });

    it('should return 422 when entry is not exist', async () => {
        const incorrect = { name: 123 };
        const response = await req
            .patch(example.incorrectUrl)
            .expect(422, 'Fully qualified resource name 123 is not exist');
    });

    it('should return 422 when payload is not valid', async () => {
        try {
            await req.post(example.urlSharedLib).send(example.correct).expect(200);

            const invalidPatch = { invalidProp: 'https://google.com' };

            let response = await req.patch(example.url).send(invalidPatch).expect(422, '"invalidProp" is not allowed');
        } finally {
            await req.delete(`${example.urlSharedLib}${querystring.escape(example.correct.name)}`);
        }
    });

    it('should return 422 when payload is empty', async () => {
        try {
            await req.post(example.urlSharedLib).send(example.correct).expect(200);

            const emptyPatch = {};

            let response = await req
                .patch(example.url)
                .send(emptyPatch)
                .expect(422, 'Patch does not contain any items to update');
        } finally {
            await req.delete(`${example.urlSharedLib}${querystring.escape(example.correct.name)}`);
        }
    });

    it('should return 404 when resource is not exists', async () => {
        const response = await req
            .patch(example.url)
            .send({ l10nManifest: 'https://google.com' })
            .expect(404, 'Shared library with name "testNameSharedLibEntry" is not exist');
    });

    it('should patch shared library resource', async () => {
        try {
            await req.post(example.urlSharedLib).send(example.correct).expect(200);

            const patch1 = { l10nManifest: 'https://google.com' };

            let response = await req.patch(example.url).send(patch1).expect(200);

            expect(response.body).to.deep.equal({
                ...example.correct,
                ...patch1,
            });

            const patch2 = { spaBundle: 'https://host.com' };

            response = await req.patch(example.url).send(patch2).expect(200);

            expect(response.body).to.deep.equal({
                ...example.correct,
                ...patch1,
                ...patch2,
            });

            const patch3 = {
                adminNotes: 'notes',
                spaBundle: 'https://host1.com',
            };

            response = await req.patch(example.url).send(patch3).expect(200);

            expect(response.body).to.deep.equal({
                ...example.correct,
                ...patch1,
                ...patch2,
                ...patch3,
            });
        } finally {
            await req.delete(`${example.urlSharedLib}${querystring.escape(example.correct.name)}`);
        }
    });

    it('should patch application resource', async () => {
        try {
            await req.post(example.urlApp).send(example.correctApp).expect(200);

            const patch1 = { l10nManifest: 'https://google.com' };

            let response = await req.patch(example.appUrl).send(patch1).expect(200);

            expect(response.body).to.deep.equal({
                ...example.correctApp,
                ...patch1,
            });

            const patch2 = { spaBundle: 'https://host.com' };

            response = await req.patch(example.appUrl).send(patch2).expect(200);

            expect(response.body).to.deep.equal({
                ...example.correctApp,
                ...patch1,
                ...patch2,
            });

            const patch3 = {
                adminNotes: 'notes',
                spaBundle: 'https://host1.com',
            };

            response = await req.patch(example.appUrl).send(patch3).expect(200);

            expect(response.body).to.deep.equal({
                ...example.correctApp,
                ...patch1,
                ...patch2,
                ...patch3,
            });
        } finally {
            await req.delete(`${example.urlApp}${example.encodedAppName}`);
        }
    });

    describe('Authentication / Authorization', () => {
        it('should deny access w/o authentication', async () => {
            await requestWithAuth().then((r) => r.post(example.url).send(example.correct).expect(401));
        });
    });
});
