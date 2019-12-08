const _ = require('lodash');
const { expect } = require('chai');

const examples = {
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
    generateExpectedResponseRoute: id => ({ id, ..._.omitBy(examples.correct, _.isNil) }),
    create: async () => {
        if (examples.correctId) throw new Error('Record has already been created');
        const response = await request.post('/api/v1/route').send(examples.correct);
        examples.correctId = response.body.id;
        return response;
    },
    delete: async () => {
        await request.delete(`/api/v1/route/${examples.correctId}`);
        examples.correctId = null;
    },
    correctId: null,
};

describe('Tests /api/v1/route', () => {
    before('should work simple "create" and "delete"', async () => {
        await examples.create();
        await request.get(`/api/v1/route/${examples.correctId}`).expect(200);
        await request.delete(`/api/v1/route/${examples.correctId}`).expect(204);
        await request.get(`/api/v1/route/${examples.correctId}`).expect(404);
        examples.correctId = null;
    });
    afterEach(examples.delete);
    describe('Create', () => {
        it('should not create record without a required field: orderPos', async () => {
            const response = await request.post('/api/v1/route')
            .send(_.omit(examples.correct, 'orderPos'))
            .expect(422, '"orderPos" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: route', async () => {
            const response = await request.post('/api/v1/route')
            .send(_.omit(examples.correct, 'route'))
            .expect(422, '"route" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: slots', async () => {
            const response = await request.post('/api/v1/route')
            .send(_.omit(examples.correct, 'slots'))
            .expect(422, '"slots" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: specialRole', async () => {
            const response = await request.post('/api/v1/route')
            .send({
                ...examples.correct,
                specialRole: examples.incorrect.specialRole
            })
            .expect(422, '"specialRole" must be [404]');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: orderPos', async () => {
            const response = await request.post('/api/v1/route')
            .send({
                ...examples.correct,
                orderPos: examples.incorrect.orderPos
            })
            .expect(422, '"orderPos" must be a number');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: route', async () => {
            const response = await request.post('/api/v1/route')
            .send({
                ...examples.correct,
                route: examples.incorrect.route
            })
            .expect(422, '"route" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: next', async () => {
            const response = await request.post('/api/v1/route')
            .send({
                ...examples.correct,
                next: examples.incorrect.next
            })
            .expect(422, '"next" must be a boolean');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: templateName', async () => {
            const response = await request.post('/api/v1/route')
            .send({
                ...examples.correct,
                templateName: examples.incorrect.templateName
            })
            .expect(422, '"templateName" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: slots', async () => {
            const response = await request.post('/api/v1/route')
            .send({
                ...examples.correct,
                slots: examples.incorrect.slots
            })
            .expect(422, '"slots" must be of type object');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post('/api/v1/route')
            .send(examples.correct)
            .expect(200);

            expect(response.body).to.have.property('id');
            const routeId = examples.correctId = response.body.id;

            const expectedRoute = examples.generateExpectedResponseRoute(routeId);
            expect(response.body).deep.equal(expectedRoute);

            response = await request.get(`/api/v1/route/${routeId}`)
            .expect(200);

            expect(response.body).deep.equal(expectedRoute);
        });
    });

    describe('Read', () => {
        it('should not return record with id which not exists', async () => {
            const response = await request.get(`/api/v1/route/${examples.incorrectRouteId}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await examples.create();

            const response = await request.get(`/api/v1/route/${examples.correctId}`)
            .expect(200);

            const expectedRoute = examples.generateExpectedResponseRoute(examples.correctId);
            expect(response.body).deep.equal(expectedRoute);
        });

        it('should successfully return all existed records', async () => {
            await examples.create();

            const response = await request.get('/api/v1/route/')
            .expect(200);

            expect(response.body.routes).to.be.an('array').that.is.not.empty;
            const expectedRoute = examples.generateExpectedResponseRoute(examples.correctId);
            expect(response.body.routes).to.deep.include(expectedRoute);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(`/api/v1/route/${examples.incorrectRouteId}`)
            .send(examples.correct)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: specialRole', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send({
                ...examples.correct,
                specialRole: examples.incorrect.specialRole
            })
            .expect(422, '"specialRole" must be [404]');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: orderPos', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send({
                ...examples.correct,
                orderPos: examples.incorrect.orderPos
            })
            .expect(422, '"orderPos" must be a number');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: route', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send({
                ...examples.correct,
                route: examples.incorrect.route
            })
            .expect(422, '"route" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: next', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send({
                ...examples.correct,
                next: examples.incorrect.next
            })
            .expect(422, '"next" must be a boolean');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: templateName', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send({
                ...examples.correct,
                templateName: examples.incorrect.templateName
            })
            .expect(422, '"templateName" must be a string');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: slots', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send({
                ...examples.correct,
                slots: examples.incorrect.slots
            })
            .expect(422, '"slots" must be of type object');

            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/route/${examples.correctId}`)
            .send(examples.updated)
            .expect(200);

            expect(response.body).deep.equal({ ...examples.updated, id: examples.correctId });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(`/api/v1/route/${examples.incorrectRouteId}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await examples.create();

            const response = await request.delete(`/api/v1/route/${examples.correctId}`)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
