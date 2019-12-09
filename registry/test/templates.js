const _ = require('lodash');
const { expect } = require('chai');

const example = {
    url: '/api/v1/template/',
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
        await request.post(example.url).send(example.correct);
    },
    delete: async () => {
        await request.delete(example.url + example.correct.name);
    },
};

describe(`Tests ${example.url}`, () => {
    before('should work simple "create" and "delete"', async () => {
        await request.post(example.url).send(example.correct).expect(200);
        await request.get(example.url + example.correct.name).expect(200);
        await request.delete(example.url + example.correct.name).expect(204);
        await request.get(example.url + example.correct.name).expect(404);
    });
    afterEach(example.delete);
    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'name'))
            .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: content', async () => {
            const response = await request.post(example.url)
            .send(_.omit(example.correct, 'content'))
            .expect(422, '"content" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            let response = await request.post(example.url)
            .send({...example.correct, name: example.incorrect.name})
            .expect(422, '"name" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: content', async () => {
            let response = await request.post(example.url)
            .send({...example.correct, content: example.incorrect.content})
            .expect(422, '"content" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + example.incorrect.content)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
            .send(example.correct)
            .expect(200)

            expect(response.body).deep.equal(example.correct);

            response = await request.get(example.url + example.correct.name)
            .expect(200);

            expect(response.body).deep.equal(example.correct);
        });
    });

    describe('Read', () => {
        it('should not return record with name which not exists', async () => {
            const response = await request.get(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await example.create();

            const response = await request.get(example.url + example.correct.name)
            .expect(200);

            expect(response.body).deep.equal(example.correct);
        });

        it('should successfully return all existed records', async () => {
            await example.create();

            const response = await request.get(example.url)
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const response = await request.put(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await example.create();

            const response = await request.put(example.url + example.correct.name)
            .send(example.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: content', async () => {
            await example.create();

            const response = await request.put(example.url + example.correct.name)
            .send(_.omit(example.incorrect, 'name'))
            .expect(422, '"content" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await example.create();

            const response = await request.put(example.url + example.correct.name)
            .send(_.omit(example.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(example.updated);
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const response = await request.delete(example.url + example.incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await example.create();

            const response = await request.delete(example.url + example.correct.name)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
