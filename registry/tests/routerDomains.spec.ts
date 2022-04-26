import _ from 'lodash';
import { request, expect, requestWithAuth } from './common';
import supertest from 'supertest';

const domainName = '127.0.0.1';
const template500 = 'testTemplate500';

const example = {
    url: '/api/v1/router_domains/',
    correct: Object.freeze({
        domainName,
        template500,
    }),
    updated: Object.freeze({
        domainName,
        template500
    }),
};

describe(`Tests ${example.url}`, () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
        await req.post('/api/v1/template/').send({
            name: example.correct.template500,
            content: 'ncTestTemplateContent'
        });
    })

    afterEach(async () => {
        await req.delete('/api/v1/template/' + example.correct.template500);
    });
    describe('Create', () => {
        it('should not create record without a required fields', async () => {
            await req.post(example.url)
                .send(_.omit(example.correct, ['domainName', 'template500']))
                .expect(422, '"domainName" is required\n' +
                    '"template500" is required');
        });

        it('should not create record with incorrect type of fields', async () => {
            const incorrect = {
                domainName: 123,
                template500: 123,
            };

            await req.post(example.url)
                .send(incorrect)
                .expect(422, '"domainName" must be a string\n' +
                    '"template500" must be a string');
        });

        it('should not create record with non-existed template500', async () => {
            const response = await req.post(example.url)
                .send({
                    ...example.correct,
                    template500: 'nonExistedTemplate',
                })
                .expect(500);

            expect(response.text).to.include('Internal server error occurred.');
        });

        it('should successfully create record', async () => {
            let routerDomainsId;

            try {
                const responseCreation = await req.post(example.url)
                    .send(example.correct)
                    .expect(200)

                routerDomainsId = responseCreation.body.id;

                expect(responseCreation.body).deep.equal({
                    id: routerDomainsId,
                    ...example.correct,
                });

                const responseFetching = await req.get(example.url + routerDomainsId)
                    .set('Host', domainName)
                    .expect(200);

                expect(responseFetching.body).deep.equal({
                    id: routerDomainsId,
                    ...example.correct,
                });
            } finally {
                routerDomainsId && await req.delete(example.url + routerDomainsId);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.post(example.url)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const nonExistingId = 123;
            await req.get(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should restrict access, in case of different domain', async () => {
            const host = '127.1.1.1';
            let domainId;

            try {
                let response = await req.get(example.url)
                    .expect(200)
                    .set('Host', host);

                expect(response?.body).to.be.an('array').with.lengthOf(0);

                response = await req.post(example.url)
                    .send(example.correct).expect(200);

                domainId = response?.body?.id;
                await req.get(example.url + domainId)
                    .expect(403)
                    .set('Host', host);

            } finally {
                domainId && await req.delete(example.url + domainId);
            }
        });

        it('should successfully return record', async () => {
            let routerDomainsId;
            const host = '127.0.0.1';

            try {
                const responseCreation = await req.post(example.url)
                    .send(example.correct).expect(200);
                routerDomainsId = responseCreation.body.id;

                const responseFetching = await req.get(example.url + routerDomainsId)
                    .set('Host', host)
                    .expect(200);

                expect(responseFetching.body).deep.equal({
                    id: routerDomainsId,
                    ...example.correct,
                });
            } finally {
                routerDomainsId && await req.delete(example.url + routerDomainsId);
            }
        });

        it('should successfully return all existed records', async () => {
            let routerDomainsId1, routerDomainsId2;
            const host = '127.0.0.1';

            try {
                const responseCreation1 = await req.post(example.url).send(example.correct).expect(200);
                const responseCreation2 = await req.post(example.url).send(example.updated).expect(200);

                routerDomainsId1 = responseCreation1.body.id;
                routerDomainsId2 = responseCreation2.body.id;

                const responseFetchingAll = await req.get(example.url)
                    .set('Host', host)
                    .expect(200);

                expect(responseFetchingAll.body).to.be.an('array').that.is.not.empty;
                expect(responseFetchingAll.body).to.deep.include({
                    id: routerDomainsId1,
                    ...example.correct,
                });
                expect(responseFetchingAll.body).to.deep.include({
                    id: routerDomainsId2,
                    ...example.updated,
                });
            } finally {
                routerDomainsId1 && await req.delete(example.url + routerDomainsId1);
                routerDomainsId2 && await req.delete(example.url + routerDomainsId2);
            }
        });
        it('should successfully return paginated list', async () => {
            const host = `127.0.0.1`;
            const rangeStart = (await req.get(example.url).set('Host', host)).body.length;

            const routerDomainsList: { id?: number; domainName: string; template500: string }[] = [...Array(5)].map((n, i) => ({
                ...example.correct,
                domainName: host,
            }));

            const promises = routerDomainsList.map(data => req.post(example.url).send(data));

            try {
                const responses = await Promise.all(promises);

                responses.forEach((response, i) => {
                    routerDomainsList[i].id = response.body.id;
                });
                const first = `${example.url}?range=${encodeURIComponent(`[${rangeStart + 0},${rangeStart + 1}]`)}`;
                const second = `${example.url}?range=${encodeURIComponent(`[${rangeStart + 2},${rangeStart + 4}]`)}`;
                const third = `${example.url}?range=${encodeURIComponent(`[${rangeStart + 1},${rangeStart + 3}]`)}`;
                const responseFetching01 = await req.get(first).set('Host', host);
                const responseFetching24 = await req.get(second).set('Host', host);
                const responseFetching13 = await req.get(third).set('Host', host);

                expect(
                    responseFetching01.header['content-range'] === responseFetching24.header['content-range'] &&
                    responseFetching24.header['content-range'] === responseFetching13.header['content-range']
                ).to.be.true;

                expect(responseFetching01.body).to.be.an('array').with.lengthOf(2);
                expect(responseFetching24.body).to.be.an('array').with.lengthOf(3);
                expect(responseFetching13.body).to.be.an('array').with.lengthOf(3);

                expect(responseFetching01.body).to.deep.eq(routerDomainsList.slice(0, 1 + 1)); // "+1" since value "to" in "range" is used like "<=" instead of "<"
                expect(responseFetching24.body).to.deep.eq(routerDomainsList.slice(2, 4 + 1));
                expect(responseFetching13.body).to.deep.eq(routerDomainsList.slice(1, 3 + 1));
            } finally {
                await Promise.all(routerDomainsList.map(item => req.delete(example.url + item.id)));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.get(example.url + 123)
                    .expect(401);
            });
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesn\'t exist', async () => {
            const nonExistingId = 123;
            await req.put(example.url + nonExistingId)
                .send(example.updated)
                .expect(404, 'Not found');
        });

        it('should not update record with incorrect type of fields', async () => {
            let routerDomainsId;

            try {
                const response = await req.post(example.url).send(example.correct).expect(200);
                routerDomainsId = response.body.id;

                const incorrect = {
                    domainName: 123,
                    template500: 456,
                };

                await req.put(example.url + routerDomainsId)
                    .send(incorrect)
                    .expect(422, '"domainName" must be a string\n' +
                        '"template500" must be a string');
            } finally {
                routerDomainsId && await req.delete(example.url + routerDomainsId);
            }
        });

        it('should successfully update record', async () => {
            let routerDomainsId;

            try {
                const responseCreation = await req.post(example.url).send(example.correct).expect(200);
                routerDomainsId = responseCreation.body.id;

                const responseUpdating = await req.put(example.url + routerDomainsId)
                    .send(example.updated)
                    .expect(200);

                expect(responseUpdating.body).deep.equal({
                    id: routerDomainsId,
                    ...example.updated,
                });
            } finally {
                routerDomainsId && await req.delete(example.url + routerDomainsId);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.put(example.url + 123)
                    .send(example.updated)
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const nonExistingId = 123;
            await req.delete(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should successfully delete record if doesn\'t have any reference from foreign to current primary key', async () => {
            const appName = '@portal/ncTestAppName';

            try {
                const responseRouterDomains = await req.post(example.url).send(example.correct).expect(200);
                const domainId = responseRouterDomains.body.id;

                await req.post('/api/v1/app/')
                    .send({
                        name: appName,
                        spaBundle: 'http://localhost:1234/ncTestAppName.js',
                        kind: 'primary',
                    })
                    .expect(200);

                const responseRoute = await req.post('/api/v1/route/')
                    .send({
                        specialRole: undefined,
                        orderPos: 122,
                        route: '/ncTestRoute/*',
                        next: false,
                        templateName: null,
                        slots: {
                            ncTestRouteSlotName: {
                                appName,
                                props: { ncTestProp: 1 },
                                kind: 'regular',
                            },
                        },
                        meta: {},
                        domainId,
                    })
                    .expect(200);

                const response = await req.delete(example.url + domainId)
                    .expect(500);
                expect(response.text).to.include('FOREIGN KEY constraint failed');

                await req.delete('/api/v1/route/' + responseRoute.body.id);

                await req.delete(example.url + domainId)
                    .expect(204, '');

                await req.get(example.url + domainId)
                    .expect(404, 'Not found');
            } finally {
                await req.delete('/api/v1/app/' + encodeURIComponent(appName));
            }
        });

        it('should successfully delete record', async () => {
            const response = await req.post(example.url).send(example.correct).expect(200);

            await req.delete(example.url + response.body.id)
                .expect(204, '');
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.delete(example.url + 123)
                    .expect(401);
            });
        });
    });
});
