const _ = require('lodash');
const { expect } = require('chai');

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
    incorrectRouteId: 123123123123123123,
    incorrect: Object.freeze({
        specialRole: 'ncTestRouteIncorrectSpecialRole',
        orderPos: 'ncTestRouteIncorrectOrderPos',
        route: 123,
        next: 456,
        templateName: 789,
        slots: 'ncTestRouteIncorrectSlots'
    }),
    updated: Object.freeze({
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
    }),
    generateExpectedResponseRoute: id => ({ id, ..._.omitBy(example.correct, _.isNil) }),
    create: async () => {
        if (example.correctId) throw new Error('Record has already been created');
        const response = await request.post(example.url).send(example.correct);
        example.correctId = response.body.id;
        return response;
    },
    delete: async () => {
        await request.delete(example.url + example.correctId);
        example.correctId = null;
    },
    correctId: null,
};

describe(`Tests ${example.url}`, () => {
    before('should work simple "create" and "delete"', async () => {
        await example.create();
        await request.get(example.url + example.correctId).expect(200);
        await request.delete(example.url + example.correctId).expect(204);
        await request.get(example.url + example.correctId).expect(404);
        example.correctId = null;
    });
    afterEach(example.delete);
    describe('Create', () => {
        it('should not create record without a required field: orderPos', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'orderPos'))
            .expect(422, '"orderPos" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: route', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'route'))
            .expect(422, '"route" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: slots', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'slots'))
            .expect(422, '"slots" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: specialRole', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                specialRole: example.incorrect.specialRole
            })
            .expect(422, '"specialRole" must be [404]');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: orderPos', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                orderPos: example.incorrect.orderPos
            })
            .expect(422, '"orderPos" must be a number');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: route', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                route: example.incorrect.route
            })
            .expect(422, '"route" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: next', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                next: example.incorrect.next
            })
            .expect(422, '"next" must be a boolean');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: templateName', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                templateName: example.incorrect.templateName
            })
            .expect(422, '"templateName" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: slots', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                slots: example.incorrect.slots
            })
            .expect(422, '"slots" must be of type object');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
            .send(example.correct)
            .expect(200);

            expect(response.body).to.have.property('id');
            const routeId = example.correctId = response.body.id;

            const expectedRoute = example.generateExpectedResponseRoute(routeId);
            expect(response.body).deep.equal(expectedRoute);

            response = await request.get(example.url + routeId)
            .expect(200);

            expect(response.body).deep.equal(expectedRoute);
        });
    });

    describe('Read', () => {
        it('should not return record with id which not exists', async () => {
            const response = await request.get(example.url + example.incorrectRouteId)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await example.create();

            const response = await request.get(example.url + example.correctId)
            .expect(200);

            const expectedRoute = example.generateExpectedResponseRoute(example.correctId);
            expect(response.body).deep.equal(expectedRoute);
        });

        it('should successfully return all existed records', async () => {
            await example.create();

            const response = await request.get(example.url)
            .expect(200);

            expect(response.body.routes).to.be.an('array').that.is.not.empty;
            const expectedRoute = example.generateExpectedResponseRoute(example.correctId);
            expect(response.body.routes).to.deep.include(expectedRoute);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(example.url + example.incorrectRouteId)
            .send(example.correct)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: specialRole', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send({
                ...example.correct,
                specialRole: example.incorrect.specialRole
            })
            .expect(422, '"specialRole" must be [404]');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: orderPos', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send({
                ...example.correct,
                orderPos: example.incorrect.orderPos
            })
            .expect(422, '"orderPos" must be a number');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: route', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send({
                ...example.correct,
                route: example.incorrect.route
            })
            .expect(422, '"route" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: next', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send({
                ...example.correct,
                next: example.incorrect.next
            })
            .expect(422, '"next" must be a boolean');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: templateName', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send({
                ...example.correct,
                templateName: example.incorrect.templateName
            })
            .expect(422, '"templateName" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: slots', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send({
                ...example.correct,
                slots: example.incorrect.slots
            })
            .expect(422, '"slots" must be of type object');

            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await example.create();

            const response = await request.put(example.url + example.correctId)
            .send(example.updated)
            .expect(200);

            expect(response.body).deep.equal({ ...example.updated, id: example.correctId });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(example.url + example.incorrectRouteId)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await example.create();

            const response = await request.delete(example.url + example.correctId)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
