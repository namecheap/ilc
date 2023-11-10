import { expect } from 'chai';
import { describe, it } from 'mocha';
import express from 'express';
import request from 'supertest';
import { contextMiddleware, storage } from '../server/middleware/context';

function createTestAppWithContextMiddleware() {
    // Create a new express application
    const app = express();

    // Add the contextMiddleware to the express application
    app.use(contextMiddleware);

    // Define a test route that will retrieve the values from the storage
    app.get('/test', (req, res) => {
        // Access the storage directly
        const store = storage.getStore();
        if (store) {
            res.send({
                reqId: store.get('reqId'),
                domain: store.get('domain'),
                path: store.get('path'),
                clientIp: store.get('clientIp'),
            });
        } else {
            res.status(500).send('No store found');
        }
    });
    return app;
}

describe('contextMiddleware', () => {
    it('should set the correct store values', (done) => {
        const app = createTestAppWithContextMiddleware();

        // Use supertest to simulate a request to the test route
        request(app)
            .get('/test?test=1')
            .set('X-Forwarded-For', '10.10.10.1,12.13.14.15')
            .expect(200)
            .end((err, response) => {
                if (err) return done(err);

                const body = response.body;
                expect(body.domain).to.equal('127.0.0.1');
                expect(body.path).to.equal('/test');
                expect(body.clientIp).to.equal('10.10.10.1');

                done();
            });
    });
});
