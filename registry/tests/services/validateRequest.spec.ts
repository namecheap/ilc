import { expect } from 'chai';
import express from 'express';
import Joi from 'joi';
import supertest from 'supertest';
import validateRequestFactory from '../../server/common/services/validateRequest';

describe('validateRequest', () => {
    function createApp(onHandled: () => void) {
        const app = express();
        app.use(express.json());
        app.put(
            '/:name',
            validateRequestFactory([
                { schema: Joi.object({ name: Joi.string() }), selector: 'params' },
                { schema: Joi.object({ props: Joi.object() }), selector: 'body' },
            ]),
            (req, res) => {
                onHandled();
                res.status(200).send('handled');
            },
        );
        return app;
    }

    it('should respond with 400 and not call the handler when body is missing', async () => {
        let handled = false;
        const app = createApp(() => {
            handled = true;
        });

        await supertest(app).put('/test').expect(400, 'Missing body in request');

        expect(handled).to.equal(false);
    });

    it('should call the handler when all selectors are present and valid', async () => {
        let handled = false;
        const app = createApp(() => {
            handled = true;
        });

        await supertest(app).put('/test').send({ props: {} }).expect(200, 'handled');

        expect(handled).to.equal(true);
    });
});
