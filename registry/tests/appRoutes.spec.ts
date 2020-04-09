import _ from 'lodash';
import { request, expect } from './common';

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
    }),
    updated: {
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
    },
};

const createTemplate = async () => {
    let response = await request.post(example.template.url)
    .send(example.template.correct)
    .expect(200);

    expect(response.body).deep.equal(example.template.correct);

    response = await request.get(example.template.url + example.template.correct.name)
    .expect(200);
    expect(response.body).deep.equal(example.template.correct);
};

const createApp = async () => {
    let response = await request.post(example.app.url)
    .send(example.app.correct)
    .expect(200);

    expect(response.body).deep.equal(example.app.correct);

    response = await request.get(example.app.url + encodeURIComponent(example.app.correct.name))
    .expect(200);

    expect(response.body).deep.equal(example.app.correct);
};

describe(`Tests ${example.url}`, () => {
    before(async () => {
        await createTemplate();
        await createApp();
    });

    after(async () => {
        await request.delete(example.template.url + example.template.correct.name).expect(204);
        await request.delete(example.app.url + encodeURIComponent(example.app.correct.name)).expect(204);
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

        it('should not create record with the same orderPos', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.post(example.url)
            .send(example.correct)
            .expect(500);

            expect(response.text).to.include('Internal server error occurred.');

            await request.delete(example.url + id);
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

        it('should not create record with non-existing slots/appName', async () => {
            const response = await request.post(example.url)
            .send({
                ...example.correct,
                slots: {
                    ncTestRouteSlotNavbar: {
                        appName: '@portal/ncTestNonExistingAppName',
                    },
                }
            })
            .expect(500);

            expect(response.text).to.include('Internal server error occurred.');
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
        it('should return 404 for non-existing id', async () => {
            const response = await request.get(example.url + 123123123123123123)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.get(example.url + id)
            .expect(200);

            const expectedRoute = { id, ..._.omitBy(example.correct, _.isNil) };
            expect(response.body).deep.equal(expectedRoute);

            await request.delete(example.url + id).expect(204);
        });

        it('should successfully return all existed records', async () => {
            let id;
            try {
                let response = await request.post(example.url).send(example.correct).expect(200);
                id = response.body.id;

                response = await request.get(example.url)
                    .expect(200);

                expect(response.body).to.be.an('array').that.is.not.empty;
                const expectedRoute = { id, ..._.omitBy(_.omit(example.correct, ['slots']), _.isNil) };
                expect(response.body).to.deep.include(expectedRoute);
            } finally {
                id && await request.delete(example.url + id).expect(204);
            }
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
            let response = await request.post(example.url).send(example.correct).expect(200);
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

            await request.delete(example.url + id).expect(204);
        });

        it('should not update record with the same orderPos', async () => {
            let response = await request.post(example.url)
            .send({ ...example.correct, orderPos: 100000, })
            .expect(200);
            const id1 = response.body.id;

            response = await request.post(example.url)
            .send({ ...example.correct, orderPos: 200000, })
            .expect(200);
            const id2 = response.body.id;

            response = await request.put(example.url + id1)
            .send({ ...example.correct, orderPos: 200000, })
            .expect(500);

            expect(response.text).to.include('Internal server error occurred.');

            await request.delete(example.url + id1).expect(204);
            await request.delete(example.url + id2).expect(204);
        });

        it('should not update record with non-existing templateName', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.put(example.url + id)
            .send({
                ...example.correct,
                templateName: 'ncTestNonExistingTemplateName',
            })
            .expect(500);

            expect(response.text).to.include('Internal server error occurred.');

            await request.delete(example.url + id).expect(204);
        });

        it('should not update record with non-existing slots/appName', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.put(example.url + id)
            .send({
                ...example.correct,
                slots: {
                    ncTestRouteSlotNavbar: {
                        appName: '@portal/ncTestNonExistingAppName',
                    },
                }
            })
            .expect(500);

            expect(response.text).to.include('Internal server error occurred.');

            await request.delete(example.url + id).expect(204);
        });

        it('should not update record without required slots/appName', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.put(example.url + id)
            .send({
                ...example.correct,
                slots: {
                    ncTestRouteSlotNavbar: {
                        appName: undefined,
                    },
                }
            })
            .expect(422, '"slots.ncTestRouteSlotNavbar.appName" is required');

            await request.delete(example.url + id).expect(204);
        });

        it('should successfully update record', async () => {
            let response = await request.post(example.url).send(example.correct).expect(200);
            const id = response.body.id;

            response = await request.put(example.url + id)
            .send(example.updated)
            .expect(200);

            expect(response.body).deep.equal({ ...example.updated, id });

            await request.delete(example.url + id).expect(204);
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
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
    });
});
