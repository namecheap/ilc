process.env.TZ = 'UTC';

import supertest, { type Agent } from 'supertest';
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
    let req: Agent;

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
    let req: Agent;
    let reqWithAuth: Agent;

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

        it('should successfully revert deletion of entity with related items', async () => {
            let routeId: number | undefined;
            let templateName = 'testVersioningTemplate';
            let appName = '@portal/testVersioningApp';
            let deletionVersionId: number;

            try {
                // Create dependencies
                const templateResp = await req.post('/api/v1/template/').send({
                    name: templateName,
                    content: '<html><head></head><body>Test</body></html>',
                });
                if (templateResp.status !== 200) {
                    throw new Error(`Failed to create template: ${templateResp.status} ${templateResp.text}`);
                }

                const appResp = await req.post('/api/v1/app/').send({
                    name: appName,
                    spaBundle: 'http://localhost:1234/app.js',
                    kind: 'primary',
                });
                if (appResp.status !== 200) {
                    throw new Error(`Failed to create app: ${appResp.status} ${appResp.text}`);
                }

                // Create a route with slots (related items)
                const createResp = await req.post('/api/v1/route/').send({
                    specialRole: undefined,
                    orderPos: 9999,
                    route: '/test-versioning/*',
                    next: false,
                    templateName: templateName,
                    slots: {
                        testSlot: {
                            appName: appName,
                            kind: 'primary',
                        },
                    },
                    meta: {},
                    domainId: null,
                });

                if (createResp.status !== 200) {
                    throw new Error(`Failed to create route: ${createResp.status} ${createResp.text}`);
                }

                routeId = createResp.body.id;

                // Delete the route (this will create a version with data_after: null)
                await req.delete(`/api/v1/route/${routeId}`).expect(204);

                // Find the deletion version
                const versionsResp = await req.get(basePath).expect(200);
                const deletionVersion = versionsResp.body.find(
                    (v: any) =>
                        v.entity_type === 'routes' && String(v.entity_id) === String(routeId) && v.data_after === null,
                );

                expect(deletionVersion).to.exist;
                deletionVersionId = deletionVersion.id;

                // Revert the deletion (this should restore both route and slots)
                const revertResp = await req.post(`${basePath}/${deletionVersionId}/revert`).expect(200);

                expect(revertResp.body.status).to.equal('ok');
                expect(revertResp.body).to.haveOwnProperty('versionId');

                // Verify the route was restored
                const routeResp = await req.get(`/api/v1/route/${routeId}`).expect(200);
                expect(routeResp.body.id).to.equal(routeId);
                expect(routeResp.body.route).to.equal('/test-versioning/*');
                expect(routeResp.body.slots).to.have.property('testSlot');
                expect(routeResp.body.slots.testSlot.appName).to.equal(appName);

                // Verify slots were restored by checking via database
                const slots = await db('route_slots').where('routeId', routeId);
                expect(slots).to.be.an('array').with.lengthOf(1);
                expect(slots[0].appName).to.equal(appName);
            } finally {
                // Cleanup
                if (routeId) {
                    await req.delete(`/api/v1/route/${routeId}`);
                }
                await req.delete(`/api/v1/app/${encodeURIComponent(appName)}`);
                await req.delete(`/api/v1/template/${templateName}`);
            }
        });

        it('should successfully revert update operation with related items', async () => {
            let routeId: number | undefined;
            let templateName = 'testVersioningTemplate2';
            let appName1 = '@portal/testVersioningApp1';
            let appName2 = '@portal/testVersioningApp2';

            try {
                // Create dependencies
                const templateResp = await req.post('/api/v1/template/').send({
                    name: templateName,
                    content: '<html><head></head><body>Test</body></html>',
                });
                if (templateResp.status !== 200) {
                    throw new Error(`Failed to create template: ${templateResp.status} ${templateResp.text}`);
                }

                const app1Resp = await req.post('/api/v1/app/').send({
                    name: appName1,
                    spaBundle: 'http://localhost:1234/app1.js',
                    kind: 'primary',
                });
                if (app1Resp.status !== 200) {
                    throw new Error(`Failed to create app1: ${app1Resp.status} ${app1Resp.text}`);
                }

                const app2Resp = await req.post('/api/v1/app/').send({
                    name: appName2,
                    spaBundle: 'http://localhost:1234/app2.js',
                    kind: 'primary',
                });
                if (app2Resp.status !== 200) {
                    throw new Error(`Failed to create app2: ${app2Resp.status} ${app2Resp.text}`);
                }

                // Create a route with initial slots
                const createResp = await req.post('/api/v1/route/').send({
                    specialRole: undefined,
                    orderPos: 9998,
                    route: '/test-versioning-update/*',
                    next: false,
                    templateName: templateName,
                    slots: {
                        testSlot: {
                            appName: appName1,
                            kind: 'primary',
                        },
                    },
                    meta: {},
                    domainId: null,
                });

                if (createResp.status !== 200) {
                    throw new Error(`Failed to create route: ${createResp.status} ${createResp.text}`);
                }

                routeId = createResp.body.id;

                // Update the route (changing slot to different app)
                await req
                    .put(`/api/v1/route/${routeId}`)
                    .send({
                        orderPos: 9998,
                        route: '/test-versioning-update-modified/*',
                        next: false,
                        templateName: templateName,
                        slots: {
                            testSlot: {
                                appName: appName2,
                                kind: 'primary',
                            },
                        },
                        meta: { updated: true },
                    })
                    .expect(200);

                // Find the update version
                const versionsResp = await req.get(basePath).expect(200);
                const updateVersion = versionsResp.body.find(
                    (v: any) =>
                        v.entity_type === 'routes' &&
                        String(v.entity_id) === String(routeId) &&
                        v.data !== null &&
                        v.data_after !== null,
                );

                expect(updateVersion).to.exist;

                // Revert the update (this should restore original route and slots)
                const revertResp = await req.post(`${basePath}/${updateVersion.id}/revert`).expect(200);

                expect(revertResp.body.status).to.equal('ok');

                // Verify the route was reverted to original state
                const routeResp = await req.get(`/api/v1/route/${routeId}`).expect(200);
                expect(routeResp.body.route).to.equal('/test-versioning-update/*');
                expect(routeResp.body.slots.testSlot.appName).to.equal(appName1);
                expect(routeResp.body.meta).to.not.have.property('updated');

                // Verify slots were restored correctly
                const slots = await db('route_slots').where('routeId', routeId);
                expect(slots).to.be.an('array').with.lengthOf(1);
                expect(slots[0].appName).to.equal(appName1);
            } finally {
                // Cleanup
                if (routeId) {
                    await req.delete(`/api/v1/route/${routeId}`);
                }
                await req.delete(`/api/v1/app/${encodeURIComponent(appName1)}`);
                await req.delete(`/api/v1/app/${encodeURIComponent(appName2)}`);
                await req.delete(`/api/v1/template/${templateName}`);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.post(`${basePath}/${dataStub[0].id}/revert`).expect(401);
            });
        });
    });
});
