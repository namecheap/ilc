import _ from 'lodash';
import {request, expect, requestWithAuth} from './common';

const example = {
    url: '/api/v1/shared_props/',
    correct: Object.freeze({
        name: 'ncTestSharedPropsName',
        props: {
            ncTestSharedPropsPropName: 'ncTestSharedPropsPropValue',
        },
        ssrProps: {
            testSsrOnly: 'value'
        }
    }),
    updated: Object.freeze({
        name: 'ncTestSharedPropsName',
        props: {
            ncTestSharedPropsPropNewName: 'ncTestSharedPropsPropNewValue',
        }
    }),
};

describe(`Tests ${example.url}`, () => {
    describe('Create', () => {
        it('should not create record without a required fields', async () => {
            await request.post(example.url)
            .send(_.omit(example.correct, ['name', 'props']))
            .expect(422, '"props" is required\n"name" is required');
        });

        it('should not create record with incorrect type of fields', async () => {
            const incorrect = {
                name: 123,
                props: 456
            };

            await request.post(example.url)
            .send(incorrect)
            .expect(422, '"props" must be of type object\n"name" must be a string');

            await request.get(example.url + incorrect.name)
            .expect(404, 'Not found');
        });

        it('should successfully create record', async () => {
            try {
                let response = await request.post(example.url)
                    .send(example.correct)
                    .expect(200)

                expect(response.body).deep.equal(example.correct);

                response = await request.get(example.url + example.correct.name)
                    .expect(200);

                expect(response.body).deep.equal(example.correct);
            } finally {
                await request.delete(example.url + example.correct.name);
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
            const incorrect = { name: 123 };
            await request.get(example.url + incorrect.name)
            .expect(404, 'Not found');
        });

        it('should successfully return record', async () => {
            try {
                await request.post(example.url).send(example.correct).expect(200);

                const response = await request.get(example.url + example.correct.name)
                    .expect(200);

                expect(response.body).deep.equal(example.correct);
            } finally {
                await request.delete(example.url + example.correct.name);
            }
        });

        it('should successfully return all existed records', async () => {
            try {
                await request.post(example.url).send(example.correct).expect(200);

                const response = await request.get(example.url)
                    .expect(200);

                expect(response.body).to.be.an('array').that.is.not.empty;
                expect(response.body).to.deep.include(example.correct);
            } finally {
                await request.delete(example.url + example.correct.name);
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
            const incorrect = { name: 123 };
            await request.put(example.url + incorrect.name)
            .expect(404, 'Not found');
        });

        it('should not update record if forbidden "name" is passed', async () => {
            try {
                await request.post(example.url).send(example.correct).expect(200);

                await request.put(example.url + example.correct.name)
                    .send(example.updated)
                    .expect(422, '"name" is not allowed');
            } finally {
                await request.delete(example.url + example.correct.name);
            }
        });

        it('should not update record with incorrect type of field: props', async () => {
            try {
                await request.post(example.url).send(example.correct).expect(200);

                const incorrect = {
                    name: 123,
                    props: 456
                };

                await request.put(example.url + example.correct.name)
                    .send(_.omit(incorrect, 'name'))
                    .expect(422, '"props" must be of type object');
            } finally {
                await request.delete(example.url + example.correct.name);
            }
        });

        it('should successfully update record', async () => {
            try {
                await request.post(example.url).send(example.correct).expect(200);

                const response = await request.put(example.url + example.correct.name)
                    .send(_.omit(example.updated, 'name'))
                    .expect(200);

                expect(response.body).deep.equal(example.updated);
            } finally {
                await request.delete(example.url + example.correct.name);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.put(example.url + example.correct.name)
                    .send(_.omit(example.updated, 'name'))
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            await request.delete(example.url + incorrect.name)
            .expect(404, 'Not found');
        });

        it('should successfully delete record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            await request.delete(example.url + example.correct.name)
            .expect(204, '');
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.delete(example.url + example.correct.name)
                    .expect(401);
            });
        });
    });
});
