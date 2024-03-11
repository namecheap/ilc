import knex from 'knex';
import { format } from 'path';
process.env.TZ = 'UTC';
import app from '../server/app';
import supertest from 'supertest';

import db from '../server/db';
import { formatDate } from '../server/util/db';
import { expect, request, requestWithAuth } from './common';

const basePath = '/api/v1/versioning';
const dataStub = [
    {
        id: 1,
        entity_type: 'templates',
        entity_id: 'testName',
        data: '{"data":{"content":"testTemplateContent"},"related":{}}',
        data_after: null,
        created_by: 'unauthenticated',
        created_at: formatDate(new Date('2023-09-22T14:18:23.000Z')),
    },
    {
        id: 2,
        entity_type: 'apps',
        entity_id: '@portal/ncTestAppName',
        data: null,
        data_after:
            '{"data":{"spaBundle":"http://localhost:1234/ncTestAppName.js","cssBundle":null,"dependencies":null,"ssr":null,"props":null,"assetsDiscoveryUrl":null,"assetsDiscoveryUpdatedAt":null,"kind":"primary","configSelector":null},"related":{}}',
        created_by: 'unauthenticated',
        created_at: formatDate(new Date('2023-09-22T14:18:24.000Z')),
    },
];

describe('Versioning Properties', () => {
    let req: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
        req = await request();
    });

    it('versionId should be increased after update', async () => {
        try {
            await req
                .post('/api/v1/shared_props')
                .send({ name: 'sharedprops1', props: { a: 'a1' }, ssrProps: {} })
                .expect(200);

            var initialGetResponse = (await req.get('/api/v1/shared_props/sharedprops1').send().expect(200)).body;

            await req
                .put('/api/v1/shared_props/sharedprops1')
                .send({ props: { a: 'a2' }, ssrProps: {} })
                .expect(200);

            var secondGetResponse = (await req.get('/api/v1/shared_props/sharedprops1').send().expect(200)).body;

            expect(initialGetResponse.props).to.eql({ a: 'a1' });
            expect(secondGetResponse.props).to.eql({ a: 'a2' });

            const initialVersionId = initialGetResponse.versionId.split('.');
            const secondVersionId = secondGetResponse.versionId.split('.');

            expect(parseInt(secondVersionId[0])).to.be.greaterThan(parseInt(initialVersionId[0]));
            expect(parseInt(secondVersionId[1])).to.not.eql(initialVersionId[1]);
        } finally {
            await req.delete('/api/v1/shared_props/sharedprops1');
        }
    });
});

describe(`Tests ${basePath}`, () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
    });

    before(async () => {
        await db('versioning').truncate();
        await db('versioning').insert(dataStub);
        await db('versioning').syncSequence();
    });

    describe('Read', () => {
        it('should successfully return all existed records sorted by created_at desc', async () => {
            const response = await req.get(basePath).expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body[0]).to.eql({ ...dataStub[1], created_at: '2023-09-22T14:18:24.000Z' });
            expect(response.body[1]).to.eql({ ...dataStub[0], created_at: '2023-09-22T14:18:23.000Z' });
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.get(basePath).expect(401);
            });
        });
    });

    describe('Revert', () => {
        it('should successfully revert operations', async () => {
            const resp = await req.post(`${basePath}/${dataStub[0].id}/revert`).expect(200);

            try {
                expect(resp.body.status).to.equal('ok');
                expect(resp.body).to.haveOwnProperty('versionId');

                const listResp = await req.get(basePath).expect(200);

                // Had 2, should become 3
                expect(listResp.body).to.be.an('array').with.lengthOf(3);
            } finally {
                await req.post(`${basePath}/${resp.body.versionId}/revert`).expect(200);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.post(`${basePath}/${dataStub[0].id}/revert`).expect(401);
            });
        });
    });
});
