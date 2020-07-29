import express from 'express';
import bodyParser from 'body-parser';
import supertest, {agent as supertestAgent} from 'supertest';
import settingsService from '../server/settings/services/SettingsService';

import auth from '../server/auth';

const getApp = () => {
    const app = express();

    app.use(bodyParser.json());

    app.use(auth(app, settingsService, {
        session: {secret: 'testSecret'}
    }));

    app.get('/protected', (req, res) => res.send('ok'));

    return app;
};

describe('Authentication / Authorization', () => {
    const request = supertest(getApp());
    //It's hardcoded in DB migrations
    const authToken = Buffer.from('root_api_token', 'utf8').toString('base64')
        + ':'
        + Buffer.from('token_secret', 'utf8').toString('base64');

    it('should return 401 for non-authenticated requests', async () => {
        await request.get('/protected')
            .expect(401);
    });

    describe('Bearer token', () => {
        it('should authenticate with correct creds', async () => {
            await request.get('/protected')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200, 'ok');
        });

        it('should not authenticate with invalid creds', async () => {
            await request.get('/protected')
                .set('Authorization', `Bearer invalid`)
                .expect(401);
        });
    });

    describe('Local login/password', () => {
        const agent = supertestAgent(getApp());

        it('should authenticate with correct creds', async () => {
            await agent.post('/auth/local')
                .set('Content-Type', 'application/json')
                .send({
                    //It's hardcoded in DB migrations
                    username: 'root',
                    password: 'pwd',
                })
                .expect(200)
                .expect('set-cookie', /connect\.sid=.+; Path=\/; HttpOnly/)
                .expect('set-cookie', /ilc:userInfo=%7B%22identifier%22%3A%22root%22%2C%22role%22%3A%22admin%22%7D; Path=\//);
        });

        it('should respect session cookie', async () => {
            await agent.get('/protected')
                .expect(200, 'ok');
        });

        it('should correctly logout', async () => {
            await agent.get('/auth/logout')
                .expect(302);

            await agent.get('/protected')
                .expect(401);
        });
    });
});
