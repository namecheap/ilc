import _ from 'lodash';
import {request, expect, requestWithAuth} from './common';

let example = <any>{
    template: {
        url: '/api/v1/template/',
        correct: {
            name: 'ncTestTemplateName',
            content: 'ncTestTemplateContent'
        },
    },
    app: {
        url: '/api/v1/app/',
        correct: {
            name: '@portal/ncTestAppName',
            spaBundle: 'http://localhost:1234/ncTestAppName.js',
            kind: 'primary',
        },
    },
    routerDomain: {
        url: '/api/v1/router_domains/',
        correct: Object.freeze({
            domainName: 'testDomainName',
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
};

example = {
    ...example,
    url: '/api/v1/route/',
    correct: Object.freeze({
        specialRole: undefined,
        orderPos: 122,
        route: '/ncTestRoute/*',
        next: false,
        templateName: example.template.correct.name,
        slots: {
            ncTestRouteSlotName: {
                appName: example.app.correct.name,
                props: { ncTestProp: 1 },
                kind: 'regular',
            },
        },
        meta: {},
        domainId: null,
    }),
    updated: Object.freeze({
        orderPos: 133,
        route: '/ncTestRouteUpdated/*',
        templateName: example.template.correct.name,
        next: false,
        slots: {
            ncTestRouteSlotNavbar: {
                appName: example.app.correct.name,
                kind: 'primary',
            },
        },
        meta: {},
    }),
};

example = {
    ...example,
    correctWithMetadata: Object.freeze({
        ...example.correct,
        meta: {
            first: 'value',
            second: null,
            third: false,
            forth: 3000,
        },
    }),
    updatedWithMetadata: Object.freeze({
        ...example.updated,
        meta: {
            second: 'value',
            forth: 5000,
        },
    }),
};

const createRouterDomain = async (routerDomain: typeof example.routerDomain) => {
    const response = await request.post(routerDomain.url).send(routerDomain.correct);

    return response.body.id;
};

describe(`Tests ${example.url}`, () => {
    before(async () => {
        await request.post(example.template.url).send(example.template.correct);
        await request.post(example.app.url).send(example.app.correct);
        await request.post(example.appWrapper.url).send(example.appWrapper.correct);
    });

    after(async () => {
        await request.delete(example.template.url + example.template.correct.name);
        await request.delete(example.app.url + encodeURIComponent(example.app.correct.name));
        await request.delete(example.appWrapper.url + encodeURIComponent(example.appWrapper.correct.name));
    });

    describe('Create', () => {
        it('should not create record without required fields', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, ['orderPos', 'route', 'slots']))
            .expect(
                422,
                '"orderPos" is required\n' +
                '"route" is required\n' +
                '"slots" is required'
            );

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of fields', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                specialRole: 'ncTestRouteIncorrectSpecialRole',
                orderPos: 'ncTestRouteIncorrectOrderPos',
                route: 123,
                next: 456,
                templateName: 789,
                domainId: 'ncTestRouteIncorrectDomainId',
                slots: 'ncTestRouteIncorrectSlots'
            })
            .expect(
                422,
                '"specialRole" must be [404]\n' +
                '"orderPos" must be a number\n' +
                '"route" must be a string\n' +
                '"next" must be a boolean\n' +
                '"templateName" must be a string\n' +
                '"slots" must be of type object\n' +
                '"domainId" must be a number'
            );

            expect(response.body).deep.equal({});
        });

        it('should not create record with the same orderPos', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.post(example.url)
                    .send(example.correct)
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should not create record with non-existing templateName', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                templateName: 'ncTestNonExistingTemplateName',
            })
            .expect(500);

            expect(response.text).to.include('Internal server error occurred.');
        });

        it('should not create record with non-existing domainId', async () => {
            const response = await request.post(example.url)
                .send({
                    ...example.correct,
                    domainId: 1111111,
                })
                .expect(500);

            expect(response.text).to.include('Internal server error occurred.');
        });

        it('should not create record with non-existing slots/appName', async () => {
            const appName = '@portal/ncTestNonExistingAppName';
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                slots: {
                    ncTestRouteSlotNavbar: { appName },
                }
            })
            .expect(422);

            expect(response.text).to.include(`Non-existing app name "${appName}" specified.`);
        });

        it('should not create record with slot pointing to the app of a kind "wrapper"', async () => {
            const appName = example.appWrapper.correct.name;
            const response = await request.post(example.url)
                .send({
                    ...example.correct,
                    slots: {
                        ncTestRouteSlotNavbar: { appName },
                    }
                })
                .expect(422);

            expect(response.text).to.include(`It's forbidden to use wrappers in routes.`);
        });

        it('should not create record without required slots/appName', async () => {
            await request.post(example.url)
            .send({
                ...example.correct,
                slots: {
                    ncTestRouteSlotNavbar: {
                        appName: undefined,
                    },
                }
            })
            .expect(422, '"slots.ncTestRouteSlotNavbar.appName" is required');
        });

        it('should successfully create record', async () => {
            let routeId;

            try {
                let response = await request.post(example.url)
                    .send(example.correct)
                    .expect(200);

                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(example.correct, _.isNil),
                };
                expect(response.body).deep.equal(expectedRoute);

                response = await request.get(example.url + routeId)
                    .expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should create record with existed domainId', async () => {
            let domainId, routeId;

            try {
                domainId = await createRouterDomain(example.routerDomain);

                const exampleWithExistedDomainId = {
                    ...example.correct,
                    domainId,
                };

                let response = await request.post(example.url)
                    .send(exampleWithExistedDomainId)
                .expect(200);

                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(exampleWithExistedDomainId, _.isNil),
                };
                expect(response.body).deep.equal(expectedRoute);

                response = await request.get(example.url + routeId)
                    .expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && await request.delete(example.url + routeId);
                domainId && await request.delete(example.routerDomain.url + domainId);
            }
        });

        it('should successfully create record with metadata', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correctWithMetadata).expect(200);
                routeId = response.body.id;

                const expectedRoute = {
                    id: routeId,
                    slots: example.correctWithMetadata.slots,
                    meta: example.correctWithMetadata.meta,
                    ..._.omitBy(_.omit(example.correctWithMetadata, ['slots', 'meta']), _.isNil)
                };

                expect(response.body).deep.equal(expectedRoute);

                response = await request.get(example.url + routeId).expect(200);

                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.post(example.url).send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const response = await request.get(example.url + 123123123123123123)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.get(example.url + routeId)
                    .expect(200);

                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(example.correct, _.isNil),
                };
                expect(response.body).deep.equal(expectedRoute);
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should successfully return all existed records', async () => {
            let routeId;
            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.get(example.url).expect(200);

                expect(response.body).to.be.an('array').that.is.not.empty;
                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(_.omit(example.correct, ['slots']), _.isNil),
                    meta: example.correct.meta,
                };
                expect(response.body).to.deep.include(expectedRoute);
            } finally {
                routeId && await request.delete(example.url + routeId);
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

                let response = await request.post(example.url)
                    .send(exampleWithExistedDomainId)
                    .expect(200);

                routeId = response.body.id;

                const queryFilter = encodeURIComponent(JSON.stringify({ domainId }));
                response = await request.get(`${example.url}?filter=${queryFilter}`).expect(200);

                expect(response.body).to.be.an('array').with.lengthOf(1);
                const expectedRoute = {
                    id: routeId,
                    ..._.omitBy(_.omit(example.correct, ['slots']), _.isNil),
                    domainId,
                };

                expect(response.body).to.deep.include(expectedRoute);
            } finally {
                routeId && await request.delete(example.url + routeId);
                domainId && await request.delete(example.routerDomain.url + domainId);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.get(example.url)
                    .expect(401);

                await requestWithAuth.get(example.url + 123)
                    .expect(401);
            });
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesn\'t exist', async () => {
            const response = await request.put(example.url + 123123123123123123)
            .send(example.correct)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of fields', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId)
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
                        '"domainId" must be a number'
                    );

                expect(response.body).deep.equal({});
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should not update record with the same orderPos', async () => {
            let routeId1, routeId2;

            try {
                let response = await request.post(example.url)
                    .send({ ...example.correct, orderPos: 100000, })
                    .expect(200);
                routeId1 = response.body.id;

                response = await request.post(example.url)
                    .send({ ...example.correct, orderPos: 200000, })
                    .expect(200);
                routeId2 = response.body.id;

                response = await request.put(example.url + routeId1)
                    .send({ ...example.correct, orderPos: 200000, })
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId1 && await request.delete(example.url + routeId1);
                routeId2 && await request.delete(example.url + routeId2);
            }
        });

        it('should not update record with non-existing templateName', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId)
                    .send({
                        ...example.correct,
                        templateName: 'ncTestNonExistingTemplateName',
                    })
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should not update record with non-existing domainId', async () => {
            let domainId, routeId;

            try {
                domainId = await createRouterDomain(example.routerDomain);

                let response = await request.post(example.url).send({ ...example.correct, domainId }).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId)
                    .send({
                        ...example.correct,
                        domainId: 1111111,
                    })
                    .expect(500);

                expect(response.text).to.include('Internal server error occurred.');
            } finally {
                routeId && await request.delete(example.url + routeId);
                domainId && await request.delete(example.routerDomain.url + domainId);
            }
        });

        it('should not update record with non-existing slots/appName', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                const appName = '@portal/ncTestNonExistingAppName';

                response = await request.put(example.url + routeId)
                    .send({
                        ...example.correct,
                        slots: {
                            ncTestRouteSlotNavbar: { appName },
                        }
                    })
                    .expect(422);

                expect(response.text).to.include(`Non-existing app name "${appName}" specified.`);
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should not update record without required slots/appName', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId)
                    .send({
                        ...example.correct,
                        slots: {
                            ncTestRouteSlotNavbar: {
                                appName: undefined,
                            },
                        }
                    })
                    .expect(422, '"slots.ncTestRouteSlotNavbar.appName" is required');
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should successfully update record', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId)
                    .send(example.updated)
                    .expect(200);

                expect(response.body).deep.equal({
                    ...example.updated,
                    id: routeId,
                });
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        it('should successfully update record with existed domainId', async () => {
            let domainId1, domainId2, routeId;

            try {
                domainId1 = await createRouterDomain(example.routerDomain);
                domainId2 = await createRouterDomain(example.routerDomain);

                let response = await request.post(example.url).send({ ...example.correct, domainId: domainId1 }).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId)
                    .send({
                        ...example.updated,
                        domainId: domainId2,
                    })
                    .expect(200);

                expect(response.body).deep.equal({
                    ...example.updated,
                    id: routeId,
                    domainId: domainId2,
                });
            } finally {
                routeId && await request.delete(example.url + routeId);
                domainId1 && await request.delete(example.routerDomain.url + domainId1);
                domainId2 && await request.delete(example.routerDomain.url + domainId2);
            }
        });

        it('should successfully update record with metadata', async () => {
            let routeId;

            try {
                let response = await request.post(example.url).send(example.correctWithMetadata).expect(200);
                routeId = response.body.id;

                response = await request.put(example.url + routeId).send(example.updatedWithMetadata).expect(200);

                expect(response.body).deep.equal({
                    ...example.updatedWithMetadata,
                    id: routeId,
                });
            } finally {
                routeId && await request.delete(example.url + routeId);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.put(example.url + 123)
                    .send(example.updated)
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const response = await request.delete(example.url + 123123123123123123)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.delete(example.url + id)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.delete(example.url + 123)
                    .expect(401);
            });
        });
    });
});
