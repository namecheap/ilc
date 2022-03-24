import { request, requestWithAuth, expect } from './common';

import db from '../server/db';

const basePath = '/api/v1/versioning';
const dataStub = [{
    id: 1,
    entity_type: 'templates',
    entity_id: 'testName',
    data: '{"data":{"content":"testTemplateContent"},"related":{}}',
    data_after: null,
    created_by: 'unauthenticated',
    created_at: 1605019085
}, {
    id: 2,
    entity_type: 'apps',
    entity_id: '@portal/ncTestAppName',
    data: null,
    data_after: '{"data":{"spaBundle":"http://localhost:1234/ncTestAppName.js","cssBundle":null,"dependencies":null,"ssr":null,"props":null,"assetsDiscoveryUrl":null,"assetsDiscoveryUpdatedAt":null,"kind":"primary","configSelector":null},"related":{}}',
    created_by: 'unauthenticated',
    created_at: 1605019085
}];

describe(`Tests ${basePath}`, () => {
    before(async () => {
        await db('versioning').truncate();
        await db('versioning').insert(dataStub);
    });

    describe('Read', () => {
        it('should successfully return all existed records sorted by created_at desc', async () => {
            const response = await request.get(basePath)
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body[0]).to.eql(dataStub[1]);
            expect(response.body[1]).to.eql(dataStub[0]);
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.get(basePath)
                    .expect(401);
            });
        });
    });


    describe('Revert', () => {
        it('should successfully revert operations', async () => {
            const resp = await request.post(`${basePath}/${dataStub[0].id}/revert`)
                .expect(200);

            try {
                expect(resp.body.status).to.equal('ok');
                expect(resp.body).to.haveOwnProperty('versionId');

                const listResp = await request.get(basePath)
                    .expect(200);

                // Had 2, should become 3
                expect(listResp.body).to.be.an('array').with.lengthOf(3);
            } finally {
                await request.post(`${basePath}/${resp.body.versionId}/revert`)
                    .expect(200);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.post(`${basePath}/${dataStub[0].id}/revert`)
                    .expect(401);
            });
        });
    });
});
