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

        it('should successfully create record', async () => {
            const responseCreation = await request.post(example.url)
                .send(example.correct)
                .expect(200)

            const id = responseCreation.body.id;

            expect(responseCreation.body).deep.equal({ id, ...example.correct });

            const responseFetching = await request.get(example.url + id)
                .expect(200);

            expect(responseFetching.body).deep.equal({ id, ...example.correct });

            await request.delete(example.url + id).expect(204, '');
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
            const responseCreation = await request.post(example.url).send(example.correct).expect(200);

            const { id } = responseCreation.body;

            const responseFetching = await request.get(example.url + id)
                .expect(200);

            expect(responseFetching.body).deep.equal({ id, ...example.correct, });

            await request.delete(example.url + id).expect(204, '');
        });

        it('should successfully return all existed records', async () => {
            const responseCreation1 = await request.post(example.url).send(example.correct).expect(200);
            const responseCreation2 = await request.post(example.url).send(example.updated).expect(200);

            const responseFetchingAll = await request.get(example.url)
                .expect(200);

            expect(responseFetchingAll.body).to.be.an('array').that.is.not.empty;
            expect(responseFetchingAll.body).to.deep.include({
                id: responseCreation1.body.id,
                ...example.correct,
            });
            expect(responseFetchingAll.body).to.deep.include({
                id: responseCreation2.body.id,
                ...example.updated,
            });

            await request.delete(example.url + responseCreation1.body.id).expect(204, '');
            await request.delete(example.url + responseCreation2.body.id).expect(204, '');
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
            const nonExistingId = 123;
            await request.put(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should not update record with incorrect type of field: domainName', async () => {
            const response = await request.post(example.url).send(example.correct).expect(200);

            const incorrect = {
                domainName: 123,
            };

            await request.put(example.url + response.body.id)
                .send(incorrect)
                .expect(422, '"domainName" must be a string');

            await request.delete(example.url + response.body.id).expect(204, '');
        });

        it('should successfully update record', async () => {
            const responseCreation = await request.post(example.url).send(example.correct).expect(200);

            const responseUpdating = await request.put(example.url + responseCreation.body.id)
                .send(example.updated)
                .expect(200);

            expect(responseUpdating.body).deep.equal({
                id: responseCreation.body.id,
                ...example.updated,
            });

            await request.delete(example.url + responseCreation.body.id).expect(204, '');
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
            const nonExistingId = 123;
            await request.delete(example.url + nonExistingId)
                .expect(404, 'Not found');
        });

        it('should successfully delete record if doesn\'t have any reference from foreign to current primary key', async () => {
            const response = await request.post(example.url).send(example.correct).expect(200);
            const domainId = response.body.id;

            const appName = '@portal/ncTestAppName';
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

            try {
                const response = await request.delete(example.url + domainId)
                    .expect(500);
                expect(response.text).to.include('Internal server error occurred.');

                await request.delete('/api/v1/route/' + responseRoute.body.id).expect(204);

                await request.delete(example.url + domainId)
                    .expect(204, '');

                await request.get(example.url + domainId)
                    .expect(404, 'Not found');
            } finally {
                await request.delete('/api/v1/app/' + encodeURIComponent(appName)).expect(204);
            }
        });

        it('should successfully delete record', async () => {
            const response = await request.post(example.url).send(example.correct).expect(200);

            await request.delete(example.url + response.body.id)
                .expect(204, '');
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.delete(example.url + 123)
                    .expect(401);
            });
        });
    });
});
