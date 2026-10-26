import _ from 'lodash';
import { db, ensureDeleted, expect, request, requestWithAuth } from './common';
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
    appSecond: {
        url: '/api/v1/app/',
        correct: {
            name: '@portal/ncTestAppSecond',
            spaBundle: 'http://localhost:1234/ncTestAppSecond.js',
            kind: 'regular',
        },
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
            .post(example.appSecond.url)
            .send(example.appSecond.correct)
            .expect(verifyEmptyResponse(example.appSecond.url));
        await req
            .post(example.appWrapper.url)
            .send(example.appWrapper.correct)
            .expect(verifyEmptyResponse(example.appWrapper.url));
    });

    after(async () => {
        await ensureDeleted(req, example.template.url + example.template.correct.name);
        await ensureDeleted(req, example.app.url + encodeURIComponent(example.app.correct.name));
        await ensureDeleted(req, example.appSecond.url + encodeURIComponent(example.appSecond.correct.name));
        await ensureDeleted(req, example.appWrapper.url + encodeURIComponent(example.appWrapper.correct.name));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should accept numbers and booleans sent as strings', async () => {
            let routeId;

            try {
                const response = await req
                    .post(example.url)
                    .send({ ...example.correct, orderPos: '122', next: 'true' })
                    .expect(200);
                routeId = response.body.id;

                expect(response.body).to.include({ orderPos: 122, next: true });
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should not create a record with an empty route', async () => {
            await req
                .post(example.url)
                .send({ ...example.correct, route: '   ' })
                .expect(422, '✖ Too small: expected string to have >=1 characters\n  → at route');
        });

        it('should create record with several apps in one slot and return them in order', async () => {
            let routeId;

            try {
                const twoApps = {
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotName: [
                            { appName: example.appSecond.correct.name, kind: 'regular', props: { layer: 'core' } },
                            { appName: app.correct.name, kind: 'primary', props: { ncTestProp: 1 } },
                        ],
                    },
                };

                let response = await req.post(example.url).send(twoApps).expect(200);
                routeId = response.body.id;

                expect(response.body.slots.ncTestRouteSlotName).deep.equal(twoApps.slots.ncTestRouteSlotName);

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body.slots.ncTestRouteSlotName).deep.equal(twoApps.slots.ncTestRouteSlotName);
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should keep the object form for a slot with one app given as a one-element array', async () => {
            let routeId;

            try {
                const response = await req
                    .post(example.url)
                    .send({
                        ...example.correct,
                        slots: { ncTestRouteSlotName: [example.correct.slots.ncTestRouteSlotName] },
                    })
                    .expect(200);
                routeId = response.body.id;

                expect(response.body.slots).deep.equal(example.correct.slots);
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should not create record with the same app twice in one slot', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotName: [{ appName: app.correct.name }, { appName: app.correct.name }],
                    },
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include('An app can be listed only once in one slot');
                expect(response.text).to.include('at slots.ncTestRouteSlotName');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should create record with a keep-alive slot entry and expose keepAlive only when set', async () => {
            let routeId;

            try {
                const withKeepAlive = {
                    ...example.correct,
                    slots: {
                        ...example.correct.slots,
                        ncTestRouteSlotKeepAlive: { appName: app.correct.name, kind: 'primary', keepAlive: true },
                    },
                };

                let response = await req.post(example.url).send(withKeepAlive).expect(200);
                routeId = response.body.id;

                expect(response.body.slots.ncTestRouteSlotKeepAlive).to.include({
                    appName: app.correct.name,
                    kind: 'primary',
                    keepAlive: true,
                });
                expect(response.body.slots.ncTestRouteSlotName).to.not.have.property('keepAlive');

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body.slots.ncTestRouteSlotKeepAlive.keepAlive).equal(true);
                expect(response.body.slots.ncTestRouteSlotName).to.not.have.property('keepAlive');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should not create record with a non-boolean keepAlive', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotName: { appName: app.correct.name, keepAlive: 'yes' },
                    },
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include('at slots.ncTestRouteSlotName.keepAlive');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                expect(response.text).equal('✖ Invalid input: expected string, received undefined\n  → at route');
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                    '✖ Not allowed together with "specialRole"\n  → at orderPos\n' +
                        '✖ Not allowed together with "specialRole"\n  → at route\n' +
                        '✖ Not allowed together with "specialRole"\n  → at next',
                );
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                    '✖ Invalid input: expected number, received string\n  → at orderPos\n' +
                        '✖ Invalid input: expected string, received number\n  → at route\n' +
                        '✖ Invalid input: expected boolean, received number\n  → at next\n' +
                        '✖ Invalid input: expected string, received number\n  → at templateName\n' +
                        '✖ Invalid input: expected record, received string\n  → at slots\n' +
                        '✖ Invalid input: expected number, received string\n  → at domainId',
                );
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                    '✖ Invalid input: expected "404"\n  → at specialRole\n' +
                        '✖ Invalid input: expected string, received number\n  → at templateName\n' +
                        '✖ Invalid input: expected record, received string\n  → at slots\n' +
                        '✖ Invalid input: expected number, received string\n  → at domainId',
                );
                expect(response.body).deep.equal({});
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                expect(response.text).to.include(
                    '✖ Invalid input: expected string, received undefined\n  → at slots.ncTestRouteSlotNavbar.appName',
                );
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId1 && (await ensureDeleted(req, example.url + routeId1));
                routeId2 && (await ensureDeleted(req, example.url + routeId2));
                domainId && (await ensureDeleted(req, example.routerDomain.url + domainId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId && (await ensureDeleted(req, example.routerDomain.url + domainId));
            }
        });

        it('should create record with domainAlias', async () => {
            let domainId, routeId;

            try {
                const domainResponse = await req
                    .post(example.routerDomain.url)
                    .send({ ...example.routerDomain.correct, alias: 'my-test-domain' });
                domainId = domainResponse.body.id;

                let response = await req
                    .post(example.url)
                    .send({ ...example.correct, domainAlias: 'my-test-domain' })
                    .expect(200);

                routeId = response.body.id;

                expect(response.body.domainId).to.equal(domainId);

                response = await req.get(example.url + routeId).expect(200);

                expect(response.body.domainId).to.equal(domainId);
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId && (await ensureDeleted(req, example.routerDomain.url + domainId));
            }
        });

        it('should not create record with non-existing domainAlias', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({ ...example.correct, domainAlias: 'non-existing' });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include('Router domain with alias "non-existing" does not exist');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should not create record with both domainId and domainAlias', async () => {
            let routeId;

            try {
                const response = await req.post(example.url).send({
                    ...example.correct,
                    domainId: 1,
                    domainAlias: 'some-alias',
                });

                if (response.body.id) {
                    routeId = response.body.id;
                }

                expect(response.status).equal(422);
                expect(response.text).to.include('contains a conflict');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId && (await ensureDeleted(req, example.routerDomain.url + domainId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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

        it('should treat an empty filter as no filter', async () => {
            const unfiltered = await req.get(example.url).expect(200);
            const emptyFilter = await req.get(example.url).query({ filter: '' }).expect(200);

            expect(emptyFilter.body).deep.equal(unfiltered.body);
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId && (await ensureDeleted(req, example.routerDomain.url + domainId));
            }
        });

        it('should successfully return records filtered by domainId="null" string', async () => {
            let routeId;
            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                // Test that domainId='null' string is converted to null
                const queryFilter = encodeURIComponent(JSON.stringify({ domainId: 'null' }));
                response = await req.get(`${example.url}?filter=${queryFilter}`).expect(200);

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
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should successfully return records filtered by routePrefix', async () => {
            const routeIds: number[] = [];
            try {
                // Create multiple routes with different prefixes
                const route1 = { ...example.correct, route: '/api/test/*' };
                const route2 = { ...example.correct, route: '/admin/test/*', orderPos: 123 };
                const route3 = { ...example.correct, route: '/public/test/*', orderPos: 124 };

                let response = await req.post(example.url).send(route1).expect(200);
                routeIds.push(response.body.id);

                response = await req.post(example.url).send(route2).expect(200);
                routeIds.push(response.body.id);

                response = await req.post(example.url).send(route3).expect(200);
                routeIds.push(response.body.id);

                // Filter by routePrefix='/api'
                const queryFilter = encodeURIComponent(JSON.stringify({ routePrefix: '/api' }));
                response = await req.get(`${example.url}?filter=${queryFilter}`).expect(200);

                expect(response.body).to.be.an('array').with.lengthOf(1);
                expect(response.body[0].route).to.equal('/api/test/*');
            } finally {
                for (const id of routeIds) {
                    await ensureDeleted(req, example.url + id);
                }
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
                        '✖ Invalid input: expected "404"\n  → at specialRole\n' +
                            '✖ Invalid input: expected number, received string\n  → at orderPos\n' +
                            '✖ Invalid input: expected string, received number\n  → at route\n' +
                            '✖ Invalid input: expected boolean, received number\n  → at next\n' +
                            '✖ Invalid input: expected string, received number\n  → at templateName\n' +
                            '✖ Invalid input: expected record, received string\n  → at slots\n' +
                            '✖ Invalid input: expected number, received string\n  → at domainId',
                    );

                expect(response.body).deep.equal({});
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId1 && (await ensureDeleted(req, example.url + routeId1));
                routeId2 && (await ensureDeleted(req, example.url + routeId2));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId && (await ensureDeleted(req, example.routerDomain.url + domainId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                    .expect(
                        422,
                        '✖ Invalid input: expected string, received undefined\n  → at slots.ncTestRouteSlotNavbar.appName',
                    );
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId1 && (await ensureDeleted(req, example.routerDomain.url + domainId1));
                domainId2 && (await ensureDeleted(req, example.routerDomain.url + domainId2));
            }
        });

        it('should update record with domainAlias', async () => {
            let domainId1, domainId2, routeId;

            try {
                const domainResponse1 = await req
                    .post(example.routerDomain.url)
                    .send({ ...example.routerDomain.correct, alias: 'update-domain-1' });
                domainId1 = domainResponse1.body.id;

                const domainResponse2 = await req
                    .post(example.routerDomain.url)
                    .send({ ...example.routerDomain.correct, alias: 'update-domain-2' });
                domainId2 = domainResponse2.body.id;

                let response = await req
                    .post(example.url)
                    .send({ ...example.correct, domainId: domainId1 })
                    .expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({ ...example.updated, domainAlias: 'update-domain-2' })
                    .expect(200);

                expect(response.body.domainId).to.equal(domainId2);
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
                domainId1 && (await ensureDeleted(req, example.routerDomain.url + domainId1));
                domainId2 && (await ensureDeleted(req, example.routerDomain.url + domainId2));
            }
        });

        it('should not update record with non-existing domainAlias', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req
                    .put(example.url + routeId)
                    .send({ ...example.updated, domainAlias: 'non-existing' });

                expect(response.status).equal(422);
                expect(response.text).to.include('Router domain with alias "non-existing" does not exist');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
            }
        });

        it('should not update record with both domainId and domainAlias', async () => {
            let routeId;

            try {
                let response = await req.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await req.put(example.url + routeId).send({
                    ...example.updated,
                    domainId: 1,
                    domainAlias: 'some-alias',
                });

                expect(response.status).equal(422);
                expect(response.text).to.include('contains a conflict');
            } finally {
                routeId && (await ensureDeleted(req, example.url + routeId));
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
                routeId && (await ensureDeleted(req, example.url + routeId));
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
