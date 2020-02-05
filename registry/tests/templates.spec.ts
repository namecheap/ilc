import _ from 'lodash';
import { request, expect } from './common.spec';

const example = {
    url: '/api/v1/template/',
    correct: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContent'
    }),
    updated: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContentUpdated'
    }),
};

describe(`Tests ${example.url}`, () => {
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
            const incorrect = {
                name: 123,
                content: 456
            };

            let response = await request.post(example.url)
            .send(incorrect)
            .expect(422, '"content" must be a string\n"name" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + incorrect.name)
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

            await request.delete(example.url + example.correct.name).expect(204);
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const incorrect = { name: 123 };
            const response = await request.get(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.get(example.url + example.correct.name)
            .expect(200);

            expect(response.body).deep.equal(example.correct);

            await request.delete(example.url + example.correct.name).expect(204);
        });

        it('should successfully return all existed records', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.get(example.url)
            .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);

            await request.delete(example.url + example.correct.name).expect(204);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesnt exist', async () => {
            const incorrect = { name: 123 };
            const response = await request.put(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.put(example.url + example.correct.name)
            .send(example.updated)
            .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});

            await request.delete(example.url + example.correct.name).expect(204);
        });

        it('should not update record with incorrect type of field: content', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const incorrect = {
                name: 123,
                content: 456
            };

            const response = await request.put(example.url + example.correct.name)
            .send(_.omit(incorrect, 'name'))
            .expect(422, '"content" must be a string');
            expect(response.body).deep.equal({});

            await request.delete(example.url + example.correct.name).expect(204);
        });

        it('should successfully update record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.put(example.url + example.correct.name)
            .send(_.omit(example.updated, 'name'))
            .expect(200);

            expect(response.body).deep.equal(example.updated);

            await request.delete(example.url + example.correct.name).expect(204);
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesnt exist', async () => {
            const incorrect = { name: 123 };
            const response = await request.delete(example.url + incorrect.name)
            .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.delete(example.url + example.correct.name)
            .expect(204, '');

            expect(response.body).deep.equal({});
        });
    });
});
