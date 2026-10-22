import { expect } from 'chai';
import express from 'express';
import supertest from 'supertest';
import { z } from 'zod';
import { validated } from '../../server/common/validation/validated';
import errorHandler from '../../server/errorHandler';

describe('validated', () => {
    const schemas = {
        params: z.strictObject({ id: z.coerce.number().int() }),
        body: z.strictObject({ name: z.string().min(1), kind: z.string().default('regular') }),
    };

    function createApp(onInput: (input: { id: number; name: string; kind: string; rawBody: unknown }) => void) {
        const app = express();
        app.use(express.json());
        app.put(
            '/:id',
            validated(schemas, async ({ params, body }, req, res) => {
                onInput({ id: params.id, name: body.name, kind: body.kind, rawBody: req.body });
                res.status(200).send('handled');
            }),
        );
        app.use(errorHandler);
        return app;
    }

    it('should pass parsed values to the handler and leave the request untouched', async () => {
        let received: unknown;
        const app = createApp((input) => {
            received = input;
        });

        await supertest(app).put('/42').send({ name: 'app' }).expect(200, 'handled');

        expect(received).to.deep.equal({ id: 42, name: 'app', kind: 'regular', rawBody: { name: 'app' } });
    });

    it('should respond with 400 and not call the handler when body is missing', async () => {
        let handled = false;
        const app = createApp(() => {
            handled = true;
        });

        await supertest(app).put('/42').expect(400, 'Missing body in request');

        expect(handled).to.equal(false);
    });

    it('should respond with 422 and Joi-style messages when validation fails', async () => {
        let handled = false;
        const app = createApp(() => {
            handled = true;
        });

        await supertest(app)
            .put('/42')
            .send({ name: '', extra: 1 })
            .expect(422, '"name" is not allowed to be empty\n"extra" is not allowed');

        expect(handled).to.equal(false);
    });

    it('should report params errors before body errors', async () => {
        const app = createApp(() => {});

        await supertest(app).put('/abc').send({}).expect(422, '"id" must be a number');
    });
});
