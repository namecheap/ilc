const _ = require('lodash');
const { expect } = require('chai');

const examples = {
    correct: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContent'
    }),
    incorrect: Object.freeze({
        name: 123,
        content: 456
    }),
    updated: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContentUpdated'
    }),
    create: async () => {
        await request.post('/api/v1/template').send(examples.correct);
    },
    delete: async () => {
        await request.delete(`/api/v1/template/${examples.correct.name}`);
    },
};

describe('Tests /api/v1/template', () => {
    before('should work simple "create" and "delete"', async () => {
        await request.post('/api/v1/template').send(examples.correct).expect(200);
        await request.get(`/api/v1/template/${examples.correct.name}`).expect(200);
        await request.delete(`/api/v1/template/${examples.correct.name}`).expect(204);
        await request.get(`/api/v1/template/${examples.correct.name}`).expect(404);
    });
    afterEach(examples.delete);
    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await request.post('/api/v1/template')
            .send(_.omit(examples.correct, 'name'))
            .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: content', async () => {
            const response = await request.post('/api/v1/template')
            .send(_.omit(examples.correct, 'content'))
            .expect(422, '"content" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            let response = await request.post('/api/v1/template')
            .send({...examples.correct, name: examples.incorrect.name})
            .expect(422, '"name" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/template/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: content', async () => {
            let response = await request.post('/api/v1/template')
            .send({...examples.correct, content: examples.incorrect.content})
            .expect(422, '"content" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(`/api/v1/template/${examples.incorrect.content}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post('/api/v1/template')
            .send(examples.correct)
            .expect(200)

            expect(response.body).deep.equal(examples.correct);

            response = await request.get(`/api/v1/template/${examples.correct.name}`)
            .expect(200);

            expect(response.body).deep.equal(examples.correct);
        });
    });

    describe('Read', () => {
        it('should not return record with name which not exists', async () => {
            const response = await request.get(`/api/v1/template/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await examples.create();

            const response = await request.get(`/api/v1/template/${examples.correct.name}`)
            .expect(200);

            expect(response.body).deep.equal(examples.correct);
        });

        it('should successfully return all existed records', async () => {
            await examples.create();

            const response = await request.get('/api/v1/template/')
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(examples.correct);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(`/api/v1/template/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/template/${examples.correct.name}`)
            .send(examples.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: content', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/template/${examples.correct.name}`)
            .send(_.omit(examples.incorrect, 'name'))
            .expect(422, '"content" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await examples.create();

            const response = await request.put(`/api/v1/template/${examples.correct.name}`)
            .send(_.omit(examples.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(examples.updated);
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(`/api/v1/template/${examples.incorrect.name}`)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await examples.create();

            const response = await request.delete(`/api/v1/template/${examples.correct.name}`)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
