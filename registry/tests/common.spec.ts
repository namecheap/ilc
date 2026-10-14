import express from 'express';
import supertest from 'supertest';
import { expect, failOnFailedCleanup } from './common';

describe('failOnFailedCleanup', () => {
    const app = express();
    app.delete('/deleted', (req, res) => res.status(204).send());
    app.delete('/missing', (req, res) => res.status(404).send('Not found'));
    app.delete('/broken', (req, res) => res.status(500).send('FOREIGN KEY constraint failed'));

    const req = failOnFailedCleanup(supertest(app));

    it('should pass a cleanup which deleted the record', async () => {
        await req.delete('/deleted');
    });

    it('should pass a cleanup which did not find the record', async () => {
        await req.delete('/missing');
    });

    it('should fail a cleanup which did not delete the record', async () => {
        await expect(req.delete('/broken')).to.be.rejectedWith(
            'Cleanup DELETE /broken failed with 500: FOREIGN KEY constraint failed',
        );
    });

    it('should not check a DELETE with an explicit expectation', async () => {
        await req.delete('/broken').expect(500);
    });
});
