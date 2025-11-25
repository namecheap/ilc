import _ from 'lodash';
import { request, expect, requestWithAuth } from './common';
import db from '../server/db';
import { makeSpecialRoute } from '../server/appRoutes/services/transformSpecialRoutes';
import supertest from 'supertest';

const app = {
    url: '/api/v1/app/',
    correct: {
        name: '@portal/ncTestAppName',
        spaBundle: 'http://localhost:1234/ncTestAppName.js',
        kind: 'primary',
    },
};

const template = {
    url: '/api/v1/template/',
    correct: {
        name: 'ncTestTemplateName',
        content: '<html><head></head><body>ncTestTemplateContent</body></html>',
    },
};

const correct = Object.freeze({
    specialRole: undefined,
    orderPos: 122,
    route: '/ncTestRoute/*',
    next: false,
    templateName: template.correct.name,
    slots: {
        ncTestRouteSlotName: {
            appName: app.correct.name,
            props: { ncTestProp: 1 },
            kind: 'regular',
        },
    },
    meta: {},
    domainId: null,
});

const updated = Object.freeze({
    orderPos: 133,
    route: '/ncTestRouteUpdated/*',
    templateName: template.correct.name,
    next: false,
    slots: {
        ncTestRouteSlotNavbar: {
            appName: app.correct.name,
            kind: 'primary',
        },
    },
    meta: {},
});

const example = {
    template,
    app,
    routerDomain: {
        url: '/api/v1/router_domains/',
        correct: Object.freeze({
            domainName: 'testDomainName.com',
            template500: 'ncTestTemplateName',
        }),
    },
    appWrapper: {
        url: '/api/v1/app/',
        correct: {
            name: '@portal/testWrapper',
            spaBundle: 'http://localhost:1234/ncTestAppName.js',
            kind: 'wrapper',
        },
    },
    url: '/api/v1/route/',
    correct,
    updated,
    correct404: Object.freeze({
        specialRole: '404',
        templateName: template.correct.name,
        slots: {
            ncTestRouteSlotName: {
                appName: app.correct.name,
                props: { ncTestProp: 1 },
                kind: 'regular',
            },
        },
        meta: {},
        domainId: null,
    }),
    correctWithMetadata: Object.freeze({
        ...correct,
        meta: {
            first: 'value',
            second: null,
            third: false,
            forth: 3000,
        },
    }),
    updatedWithMetadata: Object.freeze({
        ...updated,
        meta: {
            second: 'value',
            forth: 5000,
        },
    }),
};

const createRouterDomain = async (routerDomain: typeof example.routerDomain) => {
    const app = await request();
    const response = await app.post(routerDomain.url).send(routerDomain.correct);

    return response.body.id;
};

describe(`Tests ${example.url}`, () => {
    let req: ReturnType<typeof supertest>;

    const verifyEmptyResponse = (url: string) => (res: any) => {
        if (res.status > 299 && res.text)
            throw new Error(
                `Expected response text to be empty, got ${res.req.method} ${url} ${res.status} '${res.text}'`,
            );
    };

    before(async () => {
        req = await request();
        await req
            .post(example.template.url)
            .send(example.template.correct)
            .expect(verifyEmptyResponse(example.template.url));
        await req.post(example.app.url).send(example.app.correct).expect(verifyEmptyResponse(example.app.url));
        await req
            .post(example.appWrapper.url)
            .send(example.appWrapper.correct)
            .expect(verifyEmptyResponse(example.appWrapper.url));
    });

    after(async () => {
        await req.delete(example.template.url + example.template.correct.name);
        await req.delete(example.app.url + encodeURIComponent(example.app.correct.name));
        await req.delete(example.appWrapper.url + encodeURIComponent(example.appWrapper.correct.name));
    });

    describe('Create', () => {
        it('should successfully create record', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct);
                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(example.correct, _.isNil),
                    versionId: response.body.versionId,
                };
                expect(response.body).deep.equal(expectedRoute);

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create simple record due to required fields', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send(_.omit(example.correct, ['route', 'slots', 'next']));

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).equal('"route" is required');
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create special record due to required and forbidden fields', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ..._.omit(example.correct404, ['slots']),
                    orderPos: 122,
                    route: '/ncTestRoute/*',
                    next: false,
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).equal(
                    '"orderPos" is not allowed\n' + '"route" is not allowed\n' + '"next" is not allowed',
                );
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create simple record with incorrect type of fields', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    orderPos: 'ncTestRouteIncorrectOrderPos',
                    route: 123,
                    next: 456,
                    templateName: 789,
                    domainId: 'ncTestRouteIncorrectDomainId',
                    slots: 'ncTestRouteIncorrectSlots',
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).equal(
                    '"orderPos" must be a number\n' +
                        '"route" must be a string\n' +
                        '"next" must be a boolean\n' +
                        '"templateName" must be a string\n' +
                        '"slots" must be of type object\n' +
                        '"domainId" must be a number',
                );
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create special record with incorrect type of fields', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct404,
                    specialRole: 'ncTestRouteIncorrectSpecialRole',
                    templateName: 789,
                    domainId: 'ncTestRouteIncorrectDomainId',
                    slots: 'ncTestRouteIncorrectSlots',
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).equal(
                    '"specialRole" must be [404]\n' +
                        '"templateName" must be a string\n' +
                        '"slots" must be of type object\n' +
                        '"domainId" must be a number',
                );
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create record with the same orderPos', async () => {
            let routeId1, routeId2;

            try {
                let response1 = await req.post(example.url).send(example.correct).expect(200);
                routeId1 = response1.body.id;

                const response2 = await req.post(example.url).send({ ...example.correct, route: '/someOtherRoute' });

                if (response2.body.id) {
                    routeId2 = response2.body.id;
                }

                expect(response2.status).equal(422);
                expect(response2.text).to.include(
                    'Specified "orderPos" value already exists for routes with provided "domainId"',
                );
            } finally {
                routeId1 && (await req.delete(example.url + routeId1).expect(204));
                routeId2 && (await req.delete(example.url + routeId2).expect(204));
            }
        });

        it('should not create simple record with non-existing templateName', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    templateName: 'ncTestNonExistingTemplateName',
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(500);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create simple record with non-existing domainId', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    domainId: 1111111,
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(500);
                expect(response.text).to.include('FOREIGN KEY constraint failed');
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create record with non-existing slots/appName', async () => {
            let routeId;

            try {
                const appName = '@portal/ncTestNonExistingAppName';
                const response = await req.post(example.url).send({
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotNavbar: { appName },
                    },
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include(`Non-existing app name "${appName}" specified.`);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create record with slot pointing to the app of a kind "wrapper"', async () => {
            let routeId;

            try {
                const appName = example.appWrapper.correct.name;
                const response = await req.post(example.url).send({
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotNavbar: { appName },
                    },
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include(`It's forbidden to use wrappers in routes.`);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create record without required slots/appName', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotNavbar: {
                            appName: undefined,
                        },
                    },
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include(`"slots.ncTestRouteSlotNavbar.appName" is required`);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not create special record with the same domainId and specialRole', async () => {
            let domainId, routeId1, routeId2;

            try {
                domainId = await createRouterDomain(example.routerDomain);

                const exampleWithExistedDomainId = {
                    ...example.correct404,
                    domainId,
                };

                const response1 = await req.post(example.url).send(exampleWithExistedDomainId);
                routeId1 = response1.body.id;

                const response2 = await req.post(example.url).send(exampleWithExistedDomainId);
                if (response2.body.id) {
                    routeId2 = response2.body.id;
                }

                expect(response2.status).equal(422);
                expect(response2.text).to.include(`"specialRole" "404" for provided "domainId" already exists`);
            } finally {
                routeId1 && (await req.delete(example.url + routeId1));
                routeId2 && (await req.delete(example.url + routeId2));
                domainId && (await req.delete(example.routerDomain.url + domainId));
            }
        });

        it('should create record with existing domainId', async () => {
            let domainId, routeId;

            try {
                domainId = await createRouterDomain(example.routerDomain);

                const exampleWithExistedDomainId = {
                    ...example.correct,
                    domainId,
                };

                let response = await req.post(example.url).send(exampleWithExistedDomainId).expect(200);

                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(exampleWithExistedDomainId, _.isNil),
                    versionId: response.body.versionId,
                };
                expect(response.body).deep.equal(expectedRoute);

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
                domainId && (await req.delete(example.routerDomain.url + domainId));
            }
        });

        it('should create special record with existing domainId', async () => {
            let domainId, routeId;

            try {
                domainId = await createRouterDomain(example.routerDomain);

                const exampleWithExistedDomainId = {
                    ...example.correct404,
                    domainId,
                };

                let response = await req.post(example.url).send(exampleWithExistedDomainId).expect(200);

                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(exampleWithExistedDomainId, _.isNil),
                    versionId: response.body.versionId,
                };

                expect(response.body).deep.equal(expectedRoute);

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
                domainId && (await req.delete(example.routerDomain.url + domainId));
            }
        });

        it('should successfully create record with metadata', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correctWithMetadata).expect(200);
                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    slots: example.correctWithMetadata.slots,
                    meta: example.correctWithMetadata.meta,
                    ..._.omitBy(_.omit(example.correctWithMetadata, ['slots', 'meta']), _.isNil),
                    versionId: response.body.versionId,
                };

                expect(response.body).deep.equal(expectedRoute);

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should create record with omitted orderPos, it should be defined automatically', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(_.omit(example.correct, 'orderPos')).expect(200);

                routeId = response.body.id;

                expect(response.body.orderPos).to.be.above(0);

                await req.get(example.url + routeId).expect(200);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((req) => req.post(example.url).send(example.correct).expect(401));
            });
        });
    });

    describe('Read', () => {
        it('should return 422 for incorrect id', async () => {
            const response = await req.get(example.url + 123123123123123123).expect(422);

            expect(response.body).deep.equal({});
        });
        it('should return 404 for non-existing id', async () => {
            const response = await req.get(example.url + 100).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body)
                    .to.have.property('versionId')
                    .that.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(example.correct, _.isNil),
                    versionId: response.body.versionId,
                };
                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should successfully return all existing records', async () => {
            let routeId;
            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req.get(example.url).expect(200);

                expect(response.body).to.be.an('array').that.is.not.empty;
                expect(response.body).to.have.lengthOf(1);
                expect(response.body[0].versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(_.omit(example.correct, ['slots']), _.isNil),
                    meta: example.correct.meta,
                    versionId: response.body[0].versionId,
                };
                expect(response.body).to.deep.include(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should successfully return all existed records with filter: domainId', async () => {
            let domainId, routeId;
            try {
                domainId = await createRouterDomain(example.routerDomain);

                const exampleWithExistedDomainId = {
                    ...example.correct,
                    domainId,
                };

                let response = await req.post(example.url).send(exampleWithExistedDomainId).expect(200);

                routeId = response.body.id;

                const queryFilter = encodeURIComponent(JSON.stringify({ domainId }));
                response = await req.get(`${example.url}?filter=${queryFilter}`).expect(200);

                expect(response.body).to.be.an('array').with.lengthOf(1);
                expect(response.body[0].versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(_.omit(example.correct, ['slots']), _.isNil),
                    domainId,
                    versionId: response.body[0].versionId,
                };

                expect(response.body).to.deep.include(expectedRoute);
            } finally {
                routeId && (await req.delete(example.url + routeId));
                domainId && (await req.delete(example.routerDomain.url + domainId));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                const reqAuth = await requestWithAuth();
                await reqAuth.get(example.url).expect(401);

                await reqAuth.get(example.url + 123).expect(401);
            });
        });
    });

    describe('Update', () => {
        it("should not update any record if record doesn't exist", async () => {
            const response = await req
                .put(example.url + 123)
                .send(example.correct)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of fields', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({
                        ...example.correct,
                        specialRole: 'ncTestRouteIncorrectSpecialRole',
                        orderPos: 'ncTestRouteIncorrectOrderPos',
                        route: 123,
                        next: 456,
                        templateName: 789,
                        slots: 'ncTestRouteIncorrectSlots',
                        domainId: 'ncTestRouteIncorrectDomainId',
                    })
                    .expect(
                        422,
                        '"specialRole" must be [404]\n' +
                            '"orderPos" must be a number\n' +
                            '"route" must be a string\n' +
                            '"next" must be a boolean\n' +
                            '"templateName" must be a string\n' +
                            '"slots" must be of type object\n' +
                            '"domainId" must be a number',
                    );

                expect(response.body).deep.equal({});
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not update record with the same orderPos', async () => {
            let routeId1, routeId2;

            try {
                let response = await req
                    .post(example.url)
                    .send({ ...example.correct, orderPos: 100000 })
                    .expect(200);
                routeId1 = response.body.id;

                response = await req
                    .post(example.url)
                    .send({
                        ...example.correct,
                        route: '/someDiffRoute',
                        orderPos: 200000,
                    })
                    .expect(200);
                routeId2 = response.body.id;

                response = await req
                    .put(example.url + routeId1)
                    .send({ ...example.correct, orderPos: 200000 })
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId1 && (await req.delete(example.url + routeId1));
                routeId2 && (await req.delete(example.url + routeId2));
            }
        });

        it('should not update record with non-existing templateName', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({
                        ...example.correct,
                        templateName: 'ncTestNonExistingTemplateName',
                    })
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not update record with non-existing domainId', async () => {
            let domainId, routeId;

            try {
                domainId = await createRouterDomain(example.routerDomain);

                let response = await req
                    .post(example.url)
                    .send({ ...example.correct, domainId })
                    .expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({
                        ...example.correct,
                        domainId: 1111111,
                    })
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId && (await req.delete(example.url + routeId));
                domainId && (await req.delete(example.routerDomain.url + domainId));
            }
        });

        it('should not update record with non-existing slots/appName', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                const appName = '@portal/ncTestNonExistingAppName';

                response = await req
                    .put(example.url + routeId)
                    .send({
                        ...example.correct,
                        slots: {
                            ncTestRouteSlotNavbar: { appName },
                        },
                    })
                    .expect(422);

                expect(response.text).to.include(`Non-existing app name "${appName}" specified.`);
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should not update record without required slots/appName', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({
                        ...example.correct,
                        slots: {
                            ncTestRouteSlotNavbar: {
                                appName: undefined,
                            },
                        },
                    })
                    .expect(422, '"slots.ncTestRouteSlotNavbar.appName" is required');
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should successfully update record', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send(example.updated)
                    .expect(200);

                expect(response.body).deep.equal({
                    ...example.updated,
                    id: routeId,
                    versionId: response.body.versionId,
                });
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        it('should successfully update record with existed domainId', async () => {
            let domainId1, domainId2, routeId;

            try {
                domainId1 = await createRouterDomain(example.routerDomain);
                domainId2 = await createRouterDomain(example.routerDomain);

                let response = await req
                    .post(example.url)
                    .send({ ...example.correct, domainId: domainId1 })
                    .expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({
                        ...example.updated,
                        domainId: domainId2,
                    })
                    .expect(200);

                expect(response.body).deep.equal({
                    ...example.updated,
                    id: routeId,
                    domainId: domainId2,
                    versionId: response.body.versionId,
                });
            } finally {
                routeId && (await req.delete(example.url + routeId));
                domainId1 && (await req.delete(example.routerDomain.url + domainId1));
                domainId2 && (await req.delete(example.routerDomain.url + domainId2));
            }
        });

        it('should successfully update record with metadata', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correctWithMetadata).expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send(example.updatedWithMetadata)
                    .expect(200);

                expect(response.body).deep.equal({
                    ...example.updatedWithMetadata,
                    id: routeId,
                    versionId: response.body.versionId,
                });
            } finally {
                routeId && (await req.delete(example.url + routeId));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) =>
                    r
                        .put(example.url + 123)
                        .send(example.updated)
                        .expect(401),
                );
            });
        });
    });

    describe('Delete', () => {
        it("should not delete any record if record doesn't exist", async () => {
            const response = await req.delete(example.url + 123).expect(404, 'Not found');
            expect(response.body).deep.equal({});
        });

        it('should not delete default 404', async () => {
            let temporaryCreatedDefault404Id;
            try {
                let [default404] = await db
                    .select()
                    .from('routes')
                    .where({ route: makeSpecialRoute('404'), domainId: null });

                if (!default404) {
                    const response = await req.post(example.url).send(example.correct404);

                    default404 = response.body;

                    if (response.body.id) {
                        temporaryCreatedDefault404Id = response.body.id;
                    }
                }

                const idDefault404 = default404.id;

                const response = await req
                    .delete(example.url + idDefault404)
                    .expect(500, "Default 404 error can't be deleted");

                expect(response.body).deep.equal({});
            } finally {
                if (temporaryCreatedDefault404Id) {
                    await db('route_slots').where('routeId', temporaryCreatedDefault404Id).delete();
                    await db('routes').where('id', temporaryCreatedDefault404Id).delete();
                }
            }
        });

        it('should successfully delete record', async () => {
            let response = await req.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await req.delete(example.url + id).expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) => r.delete(example.url + 123).expect(401));
            });
        });
    });
});
