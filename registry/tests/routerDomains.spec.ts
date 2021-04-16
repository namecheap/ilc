import _ from 'lodash';
import { request, expect, requestWithAuth } from './common';

const example = {
    url: '/api/v1/router_domains/',
    correct: Object.freeze({
        domainName: 'domainNameCorrect',
    }),
    updated: Object.freeze({
        domainName: 'domainNameUpdated',
    }),
};

describe(`Tests ${example.url}`, () => {
    describe('Create', () => {
        it('should not create record without a required fields', async () => {
            await request.post(example.url)
                .send(_.omit(example.correct, ['domainName']))
                .expect(422, '"domainName" is required');
        });

        it('should not create record with incorrect type of fields', async () => {
            const incorrect = {
                domainName: 123,
            };

            await request.post(example.url)
                .send(incorrect)
                .expect(422, '"domainName" must be a string');
        });

        it('should not create record with non-existed template500', async () => {
            const response = await request.post(example.url)
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
                const responseCreation = await request.post(example.url)
                    .send(example.correct)
                    .expect(200)

                routerDomainsId = responseCreation.body.id;

                expect(responseCreation.body).deep.equal({
                    id: routerDomainsId,
                    ...example.correct,
                });

                const responseFetching = await request.get(example.url + routerDomainsId)
                    .expect(200);

                expect(responseFetching.body).deep.equal({
                    id: routerDomainsId,
                    ...example.correct,
                });
            } finally {
                routerDomainsId && await request.delete(example.url + routerDomainsId);
            }
        });

        it('should successfully create record with template for 500', async () => {
            const templateName = 'testTemplate500';
            let routerDomainsId;

            const exampleWithTemplate500 = {
                ...example.correct,
                template500: templateName,
            };

            try {
                await request.post('/api/v1/template/')
                    .send({
                        name: templateName,
                        content: 'ncTestTemplateContent'
                    });

                const responseCreation = await request.post(example.url)
                    .send(exampleWithTemplate500)
                    .expect(200)

                routerDomainsId = responseCreation.body.id;

                expect(responseCreation.body).deep.equal({
                    id: routerDomainsId,
                    ...exampleWithTemplate500,
                });

                const responseFetching = await request.get(example.url + routerDomainsId)
                    .expect(200);

                expect(responseFetching.body).deep.equal({
                    id: routerDomainsId,
                    ...exampleWithTemplate500,
                });
            } finally {
                routerDomainsId && await request.delete(example.url + routerDomainsId);
                await request.delete('/api/v1/template/' + templateName);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.post(example.url)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const nonExistingId = 123;
            await request.get(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should successfully return record', async () => {
            let routerDomainsId;

            try {
                const responseCreation = await request.post(example.url).send(example.correct).expect(200);

                routerDomainsId = responseCreation.body.id;

                const responseFetching = await request.get(example.url + routerDomainsId).expect(200);

                expect(responseFetching.body).deep.equal({
                    id: routerDomainsId,
                    ...example.correct,
                });
            } finally {
                routerDomainsId && await request.delete(example.url + routerDomainsId);
            }
        });

        it('should successfully return all existed records', async () => {
            let routerDomainsId1, routerDomainsId2;

            try {
                const responseCreation1 = await request.post(example.url).send(example.correct).expect(200);
                const responseCreation2 = await request.post(example.url).send(example.updated).expect(200);

                routerDomainsId1 = responseCreation1.body.id;
                routerDomainsId2 = responseCreation2.body.id;

                const responseFetchingAll = await request.get(example.url)
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
                routerDomainsId1 && await request.delete(example.url + routerDomainsId1);
                routerDomainsId2 && await request.delete(example.url + routerDomainsId2);
            }
        });
        it('should successfully return paginated list', async () => {
            const rangeStart = (await request.get(example.url)).body.length;

            const routerDomainsList: { id?: number; domainName: string; }[] = [...Array(5)].map((n, i) => ({
                domainName: `domainNameCorrect${i}`,
            }));

            const promises = routerDomainsList.map((n, i) => request.post(example.url).send({
                domainName: `domainNameCorrect${i}`,
            }));

            try {
                const responses = await Promise.all(promises);

                responses.forEach((response, i) => {
                    routerDomainsList[i].id = response.body.id;
                });

                const responseFetching01 = await request.get(`${example.url}?range=${encodeURIComponent(`[${rangeStart + 0},${rangeStart + 1}]`)}`);
                const responseFetching24 = await request.get(`${example.url}?range=${encodeURIComponent(`[${rangeStart + 2},${rangeStart + 4}]`)}`);
                const responseFetching13 = await request.get(`${example.url}?range=${encodeURIComponent(`[${rangeStart + 1},${rangeStart + 3}]`)}`);

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
                await Promise.all(routerDomainsList.map(item => request.delete(example.url + item.id)));
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.get(example.url + 123)
                    .expect(401);
            });
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesn\'t exist', async () => {
            const nonExistingId = 123;
            await request.put(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should not update record with incorrect type of field: domainName', async () => {
            let routerDomainsId;

            try {
                const response = await request.post(example.url).send(example.correct).expect(200);
                routerDomainsId = response.body.id;

                const incorrect = {
                    domainName: 123,
                };

                await request.put(example.url + routerDomainsId)
                    .send(incorrect)
                    .expect(422, '"domainName" must be a string');
            } finally {
                routerDomainsId && await request.delete(example.url + routerDomainsId);
            }
        });

        it('should successfully update record', async () => {
            let routerDomainsId;

            try {
                const responseCreation = await request.post(example.url).send(example.correct).expect(200);
                routerDomainsId = responseCreation.body.id;

                const responseUpdating = await request.put(example.url + routerDomainsId)
                    .send(example.updated)
                    .expect(200);

                expect(responseUpdating.body).deep.equal({
                    id: routerDomainsId,
                    ...example.updated,
                });
            } finally {
                routerDomainsId && await request.delete(example.url + routerDomainsId);
            }
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const nonExistingId = 123;
            await request.delete(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should successfully delete record if doesn\'t have any reference from foreign to current primary key', async () => {
            const appName = '@portal/ncTestAppName';

            try {
                const responseRouterDomains = await request.post(example.url).send(example.correct).expect(200);
                const domainId = responseRouterDomains.body.id;

                await request.post('/api/v1/app/')
                    .send({
                        name: appName,
                        spaBundle: 'http://localhost:1234/ncTestAppName.js',
                        kind: 'primary',
                    })
                    .expect(200);

                const responseRoute = await request.post('/api/v1/route/')
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

                const response = await request.delete(example.url + domainId)
                    .expect(500);
                expect(response.text).to.include('Internal server error occurred.');

                await request.delete('/api/v1/route/' + responseRoute.body.id);

                await request.delete(example.url + domainId)
                    .expect(204, '');

                await request.get(example.url + domainId)
                    .expect(404, 'Not found');
            } finally {
                await request.delete('/api/v1/app/' + encodeURIComponent(appName));
            }
        });

        it('should successfully delete record', async () => {
            const response = await request.post(example.url).send(example.correct).expect(200);

            await request.delete(example.url + response.body.id)
                .expect(204, '');
        });
    });
});
