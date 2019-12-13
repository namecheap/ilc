import _ from 'lodash';
import { request, expect } from './common';

const example = {
    url: '/api/v1/route/',
    correct: Object.freeze({
        specialRole: undefined,
        orderPos: 122,
        route: '/ncTestRoute/*',
        next: false,
        templateName: undefined,
        slots: {
            ncTestRouteSlotNavbar: {
                appName: '@portal/ncTestRouteSlotNavbar',
                props: { ncTestProp: 1 }
            },
            ncTestRouteSlotBody: {
                appName: '@portal/ncTestRouteSlotSystem',
            }
        }
    }),
    updated: {
        orderPos: 133,
        route: '/ncTestRouteUpdated/*',
        next: false,
        slots: {
            ncTestRouteSlotNavbar: {
                appName: '@portal/ncTestRouteSlotNavbarUpdated',
            },
            ncTestRouteSlotBody: {
                appName: '@portal/ncTestRouteSlotSystemUpdated',
                props: { ncTestProp: 2 }
            }
        }
    },
};

describe(`Tests ${example.url}`, () => {
    before('should work simple "create" and "delete"', async () => {
        const response = await request.post(example.url).send(example.correct);
        await request.get(example.url + response.body.id).expect(200);
        await request.delete(example.url + response.body.id).expect(204);
        await request.get(example.url + response.body.id).expect(404);
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
                slots: 'ncTestRouteIncorrectSlots'
            })
            .expect(
                422,
                '"specialRole" must be [404]\n' +
                '"orderPos" must be a number\n' +
                '"route" must be a string\n' +
                '"next" must be a boolean\n' +
                '"templateName" must be a string\n' +
                '"slots" must be of type object'
            );

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
            .send(example.correct)
            .expect(200);

            expect(response.body).to.have.property('id');
            const id = response.body.id;

            const expectedRoute = { id, ..._.omitBy(example.correct, _.isNil) };
            expect(response.body).deep.equal(expectedRoute);

            response = await request.get(example.url + id)
            .expect(200);

            expect(response.body).deep.equal(expectedRoute);

            await request.delete(example.url + id);
        });
    });

    describe('Read', () => {
        it('should not return record with id which not exists', async () => {
            const response = await request.get(example.url + 123123123123123123)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            let response = await request.post(example.url).send(example.correct);
            const id = response.body.id;
            
            response = await request.get(example.url + id)
            .expect(200);

            const expectedRoute = { id, ..._.omitBy(example.correct, _.isNil) };
            expect(response.body).deep.equal(expectedRoute);

            await request.delete(example.url + id);
        });

        it('should successfully return all existed records', async () => {
            let response = await request.post(example.url).send(example.correct);
            const id = response.body.id;

            response = await request.get(example.url)
            .expect(200);

            expect(response.body.routes).to.be.an('array').that.is.not.empty;
            const expectedRoute = { id, ..._.omitBy(example.correct, _.isNil) };
            expect(response.body.routes).to.deep.include(expectedRoute);

            await request.delete(example.url + id);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(example.url + 123123123123123123)
            .send(example.correct)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: specialRole', async () => {
            let response = await request.post(example.url).send(example.correct);
            const id = response.body.id;

            response = await request.put(example.url + id)
            .send({
                ...example.correct,
                specialRole: 'ncTestRouteIncorrectSpecialRole',
                orderPos: 'ncTestRouteIncorrectOrderPos',
                route: 123,
                next: 456,
                templateName: 789,
                slots: 'ncTestRouteIncorrectSlots'
            })
            .expect(
                422,
                '"specialRole" must be [404]\n' +
                '"orderPos" must be a number\n' +
                '"route" must be a string\n' +
                '"next" must be a boolean\n' +
                '"templateName" must be a string\n' +
                '"slots" must be of type object'
            );

            expect(response.body).deep.equal({});

            await request.delete(example.url + id);
        });

        it('should successfully update record', async () => {
            let response = await request.post(example.url).send(example.correct);
            const id = response.body.id;

            response = await request.put(example.url + id)
            .send(example.updated)
            .expect(200);

            expect(response.body).deep.equal({ ...example.updated, id });

            await request.delete(example.url + id);
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(example.url + 123123123123123123)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            let response = await request.post(example.url).send(example.correct);
            const id = response.body.id;

            response = await request.delete(example.url + id)
            .expect(204, '');

            expect(response.body).deep.equal({});

            await request.delete(example.url + id);
        });
    });
});
