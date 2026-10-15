import express from 'express';
import supertest from 'supertest';
import { ensureDeleted, expect } from './common';

describe('ensureDeleted', () => {
    const app = express();
    app.delete('/deleted', (req, res) => res.status(204).send());
    app.delete('/missing', (req, res) => res.status(404).send('Not found'));
    app.delete('/broken', (req, res) => res.status(500).send('FOREIGN KEY constraint failed'));

    const req = supertest(app);

    it('should pass when the record is deleted', async () => {
        await ensureDeleted(req, '/deleted');
    });

    it('should pass when the record is already absent', async () => {
        await ensureDeleted(req, '/missing');
    });

    it('should fail when the record is not deleted', async () => {
        await expect(ensureDeleted(req, '/broken')).to.be.rejectedWith(
            'Cleanup DELETE /broken failed with 500: FOREIGN KEY constraint failed',
        );
    });
});
