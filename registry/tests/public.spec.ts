import { request, requestWithAuth, expect } from './common';

describe(`Tests for public API`, () => {
    describe('appDiscovery', () => {
        const url = '/api/v1/public/app_discovery';
        const result = Object.freeze({
            name: '@portal/ncTestAppReactSsr',
            discoveryMetadata: {
                existedFoo: 'foo',
                existedBar: 'bar',
            },
        });

        before(async () => {
            const record = {
                name: '@portal/ncTestAppReactSsr',
                spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
                cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
                configSelector: ['ncTestSharedPropsName'],
                ssr: {
                    src: "http://127.0.0.1:1234/fragment",
                    timeout: 1000,
                },
                kind: 'primary',
                discoveryMetadata: {
                    existedFoo: 'foo',
                    existedBar: 'bar',
                },
                adminNotes: 'Lorem ipsum',
            };

            await request().then(r => r.post('/api/v1/app/').send(record));
        });

        after(async () => {
            const encodedName = encodeURIComponent(result.name);
            await request().then(r => r.delete('/api/v1/app/' + encodedName));
        });

        it('should successfully return records', async () => {
            const response = await request().then(r => r.get(url).expect(200));

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(result);
        });

        describe('Authentication / Authorization', () => {
            it('should be accessible w/o authentication', async () => {
                await requestWithAuth().then(r => r.get(url)
                    .expect(200));
            });
        });
    });
});
