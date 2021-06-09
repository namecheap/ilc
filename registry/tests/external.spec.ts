import _ from 'lodash';
import { request, requestWithAuth, expect } from './common';

describe(`Tests for external API`, () => {
    describe('getAppsByMetadata', () => {
        const url = '/api/v1/external/apps_by_metadata';
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

            await request.post('/api/v1/app/').send(record);
        });

        after(async () => {
            const encodedName = encodeURIComponent(result.name);
            await request.delete('/api/v1/app/' + encodedName);
        });


        it('should return empty array for non-existing metadata field', async () => {
            const response = await request.get(url + '?nonExisted=foo').expect(200);

            expect(response.body).deep.equal([]);
        });

        it('should not return record if one metadata field is correct but another isn\'t', async () => {
            const response = await request.get(url + '?existedFoo=foo&nonExisted=foo').expect(200);

            expect(response.body).deep.equal([]);
        });

        it('should successfully return record with correct metadata fields', async () => {
            const response = await request.get(url + '?existedFoo=foo&existedBar=bar').expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(result);
        });

        it('should successfully return record if query isn\'t provided', async () => {
            const response = await request.get(url).expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(result);
        });

        describe('Authentication / Authorization', () => {
            it('should be accessible w/o authentication', async () => {
                await requestWithAuth.get(url)
                    .expect(200);
            });
        });
    });
});
