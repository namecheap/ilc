import assert from 'assert';
import * as bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import express, { NextFunction, Request, Response, type Express } from 'express';
import fs from 'fs';
import nock from 'nock';
import querystring from 'querystring';
import sinon from 'sinon';
import supertest, { agent as supertestAgent, SuperTest } from 'supertest';
import { useAuth } from '../server/auth';
import { OpenIdService } from '../server/auth/services/OpenIdService';
import db from '../server/db';
import { SettingKeys } from '../server/settings/interfaces';
import settingsService from '../server/settings/services/SettingsService';
import { getLogger } from '../server/util/logger';
import { loadPlugins } from '../server/util/pluginManager';
import keys from './data/auth/keys';
import token, { generateIdToken } from './data/auth/token-response';
import { muteConsole, unmuteConsole } from './utils/console';

const generateResp403 = (username: string) => ({
    message: `Access denied. "${username}" has "readonly" access.`,
});

const getApp = async () => {
    loadPlugins();
    const app = express();

    app.use(bodyParser.json());

    app.use(
        await useAuth(
            app,
            new OpenIdService(settingsService),
            {
                session: { secret: 'testSecret' },
            },
            getLogger(),
        ),
    );

    app.use('/protected', (req, res) => res.send('ok'));
    app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        console.error(error);
        res.status(500).send(error.stack);
    });

    return app;
};

describe('Authentication / Authorization', () => {
    afterEach(() => {
        sinon.restore();
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('Common', async () => {
        it('should return 401 for non-authenticated requests', async () => {
            const request = supertest(await getApp());
            await request.get('/protected').expect(401);
        });
    });

    describe('Bearer token', async () => {
        let request: SuperTest<supertest.Test>;
        let authToken: string;
        let userIdentifier: string;
        before(async () => {
            request = supertest(await getApp());

            userIdentifier = 'root_api_token';

            //It's hardcoded in DB migrations
            authToken =
                Buffer.from(userIdentifier, 'utf8').toString('base64') +
                ':' +
                Buffer.from('token_secret', 'utf8').toString('base64');
        });

        it('should not authenticate with invalid credentails', async () => {
            await request.get('/protected').set('Authorization', `Bearer invalid`).expect(401);
        });

        it('should authenticate with correct credentails', async () => {
            await request.get('/protected').set('Authorization', `Bearer ${authToken}`).expect(200, 'ok');
        });

        describe('Roles', () => {
            it('should provide correct access for "admin"', async () => {
                await request.get('/protected').set('Authorization', `Bearer ${authToken}`).expect(200);

                await request.post('/protected').set('Authorization', `Bearer ${authToken}`).expect(200);

                await request.put('/protected').set('Authorization', `Bearer ${authToken}`).expect(200);

                await request.delete('/protected').set('Authorization', `Bearer ${authToken}`).expect(200);
            });

            it('should provide correct access for "readonly"', async () => {
                await db('auth_entities').where('identifier', userIdentifier).update({
                    role: 'readonly',
                });

                try {
                    await request.get('/protected').set('Authorization', `Bearer ${authToken}`).expect(200);

                    await request
                        .post('/protected')
                        .set('Authorization', `Bearer ${authToken}`)
                        .expect(403, generateResp403(userIdentifier));

                    await request
                        .put('/protected')
                        .set('Authorization', `Bearer ${authToken}`)
                        .expect(403, generateResp403(userIdentifier));

                    await request
                        .delete('/protected')
                        .set('Authorization', `Bearer ${authToken}`)
                        .expect(403, generateResp403(userIdentifier));
                } finally {
                    await db('auth_entities').where('identifier', userIdentifier).update({
                        role: 'admin',
                    });
                }
            });
        });
    });

    describe('Local login/password', () => {
        let agent: ReturnType<typeof supertestAgent>;

        beforeEach(async () => {
            agent = supertestAgent(await getApp());
        });

        afterEach(async () => {
            await agent.get('/auth/logout').expect(302);
        });

        it('should authenticate with correct creds', async () => {
            const expectedCookie = JSON.stringify({
                authEntityId: 1,
                identifier: 'root',
                role: 'admin',
            });
            const cookieRegex = new RegExp(`ilc:userInfo=${encodeURIComponent(expectedCookie)}; Path=/`);

            await agent
                .post('/auth/local')
                .set('Content-Type', 'application/json')
                .send({
                    //It's hardcoded in DB migrations
                    username: 'root',
                    password: 'pwd',
                })
                .expect(200)
                .expect('set-cookie', /connect\.sid=.+; Path=\/; HttpOnly/)
                .expect('set-cookie', cookieRegex);

            // respect session cookie
            await agent.get('/protected').expect(200, 'ok');

            // correctly logout
            await agent.get('/auth/logout').expect(302);
            await agent.get('/protected').expect(401);
        });

        describe('Roles', () => {
            const userIdentifier = 'user_test_role';
            const password = 'user_test_role_password';

            beforeEach(async () => {
                await db('auth_entities').insert({
                    identifier: userIdentifier,
                    provider: 'local',
                    secret: await bcrypt.hash(password, await bcrypt.genSalt()),
                    role: 'admin',
                });
            });

            afterEach(async () => {
                await agent.get('/auth/logout');
                await db('auth_entities').where('identifier', userIdentifier).delete();
            });

            it('should provide correct access for "admin"', async () => {
                await agent
                    .post('/auth/local')
                    .set('Content-Type', 'application/json')
                    .send({ username: userIdentifier, password });

                await agent.get('/protected').expect(200);

                await agent.post('/protected').expect(200);

                await agent.put('/protected').expect(200);

                await agent.delete('/protected').expect(200);
            });

            it('should provide correct access for "readonly"', async () => {
                await db('auth_entities').where('identifier', userIdentifier).update({
                    role: 'readonly',
                });

                await agent
                    .post('/auth/local')
                    .set('Content-Type', 'application/json')
                    .send({ username: userIdentifier, password });

                await agent.get('/protected').expect(200);

                await agent.post('/protected').expect(403, generateResp403(userIdentifier));

                await agent.put('/protected').expect(403, generateResp403(userIdentifier));

                await agent.delete('/protected').expect(403, generateResp403(userIdentifier));
            });
        });
    });

    describe('OpenID Connect', () => {
        let app: Express;
        let agent: supertest.SuperTest<supertest.Test>;
        let oidcServer: nock.Scope;
        let tokenEndpoint: nock.Scope;

        beforeEach(async () => {
            app = await getApp();
            agent = supertestAgent(app);
        });

        beforeEach(() => {
            oidcServer = nock('https://ad.example.doesnotmatter.com/').persist();

            oidcServer
                .get('/adfs/.well-known/openid-configuration')
                .reply(200, fs.readFileSync(__dirname + '/data/auth/openid-configuration.json'));
            tokenEndpoint = oidcServer.post('/adfs/oauth2/token/').reply(200, JSON.stringify(token));
            oidcServer.get('/adfs/discovery/keys').reply(200, JSON.stringify(keys));
        });

        it('should be possible to turn it off/on in settings', async () => {
            muteConsole();

            try {
                //Disabled by default

                await agent.get('/auth/openid').expect(404);

                await agent.get('/auth/openid/return').expect(404);

                await agent.post('/auth/openid/return').expect(404);

                sinon.stub(settingsService, 'get').returns(Promise.resolve(true));
                //settings.get.withArgs(SettingKeys.AuthOpenIdEnabled).returns(Promise.resolve(true));

                await agent.get('/auth/openid').expect(500); //500 since we don't stub anything else

                await agent.get('/auth/openid/return').expect(500); //500 since we don't stub anything else

                await agent.post('/auth/openid/return').expect(500); //500 since we don't stub anything else
            } finally {
                unmuteConsole();
            }
        });

        describe('Authentication', () => {
            let getStub: sinon.SinonStub<[SettingKeys, (string | null | undefined)?], Promise<any>>;

            const getQueryOfCodeAndSessionState = (location: string) => {
                const sessionState = location.match(/&state=(.+)/)![1];

                return `code=AAAAAAAAAAAAAAAAAAAAAA.7UjvqJE02Ag0ALN4QpjqgYZze6I.cStoX13h4k_jZPkfxNvFYEK8Vh4Vr1bAomKpI72xC457l5qyppB4pVq9YNyx-DFx6n9c7eWL4S36g-pa1dXd-KvwI32CjaadHDwfBogpGnBXX12_ytUsU8XIG0oRJrAix7MEDtHf1B_0W2DTO6cAJz8FUOTAh_VQ4QOETxnm458tHFu6iZvN5InmIVr5WILzFBhDnpaJEZzLgmKeYW5voCaoGa2gacPb7J5PJ0RBqP01JCi-K6XtIuO3JZNDikE9RlW2u5nKeaaojn6eRZKGu88NLywvjBXSzoMw5VfR9bH-RyaKe01QVtefeiY6ROGXNtdxw0i2K2a-YoG6SH49xA&state=${sessionState}`;
            };

            beforeEach(() => {
                getStub = sinon.stub(settingsService, 'get');

                getStub.withArgs(SettingKeys.BaseUrl).returns(Promise.resolve('http://localhost:4000/'));
                getStub.withArgs(SettingKeys.AuthOpenIdEnabled).returns(Promise.resolve(true));
                getStub
                    .withArgs(SettingKeys.AuthOpenIdDiscoveryUrl)
                    .returns(Promise.resolve('https://ad.example.doesnotmatter.com/adfs/'));
                getStub
                    .withArgs(SettingKeys.AuthOpenIdClientId)
                    .returns(Promise.resolve('ba05c345-e144-4688-b0be-3e1097ddd32d'));
                getStub.withArgs(SettingKeys.AuthOpenIdClientSecret).returns(Promise.resolve('secret'));
                getStub.withArgs(SettingKeys.AuthOpenIdIdentifierClaimName).returns(Promise.resolve('email'));
            });

            afterEach(async () => {
                await agent.get('/auth/logout');
            });

            it('should fail against OpenID server for unknown auth entity', async () => {
                const res = await agent
                    .get('/auth/openid')
                    .expect(302)
                    .expect(
                        'Location',
                        new RegExp(
                            'https://ad\\.example\\.doesnotmatter\\.com/adfs/oauth2/authorize/\\?client_id=ba05c345-e144-4688-b0be-3e1097ddd32d&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fopenid%2Freturn&state=.+?$',
                        ),
                    );

                await agent
                    .get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`)
                    .expect(401)
                    .expect(
                        `<pre>Can't find presented identifiers "main-user@namecheap.com" in auth entities list</pre><br><a href="/">Go to main page</a>`,
                    );

                await agent.get('/protected').expect(401);
            });

            it('should fail if missing claim in response', async () => {
                getStub.withArgs(SettingKeys.AuthOpenIdIdentifierClaimName).returns(Promise.resolve('some'));

                const res = await agent
                    .get('/auth/openid')
                    .expect(302)
                    .expect(
                        'Location',
                        new RegExp(
                            'https://ad\\.example\\.doesnotmatter\\.com/adfs/oauth2/authorize/\\?client_id=ba05c345-e144-4688-b0be-3e1097ddd32d&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fopenid%2Freturn&state=.+?$',
                        ),
                    );

                await agent
                    .get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`)
                    .expect(401)
                    .expect(
                        `<pre>Can't find user identifier using IdentityClaimName</pre><br><a href="/">Go to main page</a>`,
                    );

                await agent.get('/protected').expect(401);
            });

            it('should fail if call reply without session', async () => {
                const res = await agent
                    .get('/auth/openid')
                    .expect(302)
                    .expect(
                        'Location',
                        new RegExp(
                            'https://ad\\.example\\.doesnotmatter\\.com/adfs/oauth2/authorize/\\?client_id=ba05c345-e144-4688-b0be-3e1097ddd32d&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fopenid%2Freturn&state=.+?$',
                        ),
                    );

                agent = supertestAgent(app);

                await agent
                    .get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`)
                    .expect(401)
                    .expect('Unauthorized');

                await agent.get('/protected').expect(401);
            });

            describe('Create test user & perform authentication', () => {
                const userIdentifier = 'main-user@namecheap.com'; // Same as in test token
                const readonlyIdentifier = 'readonly-user@namecheap.com';

                beforeEach(async () => {
                    await db('auth_entities').whereIn('identifier', [userIdentifier, readonlyIdentifier]).delete();
                    await db('auth_entities').insert({
                        identifier: userIdentifier,
                        provider: 'openid',
                        role: 'admin',
                    });
                    await db('auth_entities').insert({
                        identifier: readonlyIdentifier,
                        provider: 'openid',
                        role: 'readonly',
                    });
                });

                afterEach(async () => {
                    await db('auth_entities').whereIn('identifier', [userIdentifier, readonlyIdentifier]).delete();
                });

                it('should authenticate against OpenID server', async () => {
                    const res = await agent
                        .get('/auth/openid')
                        .expect(302)
                        .expect(
                            'Location',
                            new RegExp(
                                'https://ad\\.example\\.doesnotmatter\\.com/adfs/oauth2/authorize/\\?client_id=ba05c345-e144-4688-b0be-3e1097ddd32d&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fopenid%2Freturn&state=.+?$',
                            ),
                        );

                    await agent
                        .get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`)
                        .expect(302)
                        .expect('Location', '/')
                        .expect((res) => {
                            let setCookie = res.header['set-cookie'];
                            assert.ok(Array.isArray(setCookie));
                            assert.ok(setCookie[0]);

                            const parts: any = querystring.parse(setCookie[0].replace(/\s?;\s?/, '&'));
                            const userInfo = JSON.parse(parts['ilc:userInfo']);

                            assert.strictEqual(userInfo.identifier, userIdentifier);
                            assert.strictEqual(userInfo.role, 'admin');
                        });

                    // respect session cookie
                    await agent.get('/protected').expect(200, 'ok');

                    // correctly logout
                    await agent.get('/auth/logout').expect(302);
                    await agent.get('/protected').expect(401);
                });
                it('should authenticate against OpenID server (case-insensitive identifier)', async () => {
                    nock.cleanAll();
                    oidcServer = nock('https://ad.example.doesnotmatter.com/').persist();

                    oidcServer
                        .get('/adfs/.well-known/openid-configuration')
                        .reply(200, fs.readFileSync(__dirname + '/data/auth/openid-configuration.json'));
                    tokenEndpoint = oidcServer
                        .post('/adfs/oauth2/token/')
                        .reply(
                            200,
                            JSON.stringify({ ...token, id_token: generateIdToken(userIdentifier.toUpperCase()) }),
                        );
                    oidcServer.get('/adfs/discovery/keys').reply(200, JSON.stringify(keys));

                    const res = await agent
                        .get('/auth/openid')
                        .expect(302)
                        .expect(
                            'Location',
                            new RegExp(
                                'https://ad\\.example\\.doesnotmatter\\.com/adfs/oauth2/authorize/\\?client_id=ba05c345-e144-4688-b0be-3e1097ddd32d&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fopenid%2Freturn&state=.+?$',
                            ),
                        );

                    await agent
                        .get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`)
                        .expect(302)
                        .expect('Location', '/')
                        .expect((res) => {
                            let setCookie = res.header['set-cookie'];
                            assert.ok(Array.isArray(setCookie));
                            assert.ok(setCookie[0]);

                            const parts: any = querystring.parse(setCookie[0].replace(/\s?;\s?/, '&'));
                            const userInfo = JSON.parse(parts['ilc:userInfo']);

                            assert.strictEqual(userInfo.identifier, userIdentifier);
                            assert.strictEqual(userInfo.role, 'admin');
                        });

                    // respect session cookie
                    await agent.get('/protected').expect(200, 'ok');

                    // correctly logout
                    await agent.get('/auth/logout').expect(302);
                    await agent.get('/protected').expect(401);
                });

                it('should authenticate against OpenID server & perform impersonation', async () => {
                    getStub.withArgs(SettingKeys.AuthOpenIdUniqueIdentifierClaimName).returns(Promise.resolve('upn'));

                    const res = await agent
                        .get('/auth/openid')
                        .expect(302)
                        .expect(
                            'Location',
                            new RegExp(
                                'https://ad\\.example\\.doesnotmatter\\.com/adfs/oauth2/authorize/\\?client_id=ba05c345-e144-4688-b0be-3e1097ddd32d&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fopenid%2Freturn&state=.+?$',
                            ),
                        );

                    await agent
                        .get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`)
                        .expect(302)
                        .expect('Location', '/')
                        .expect((res) => {
                            let setCookie = res.header['set-cookie'];
                            assert.ok(Array.isArray(setCookie));
                            assert.ok(setCookie[0]);

                            const parts: any = querystring.parse(setCookie[0].replace(/\s?;\s?/, '&'));
                            const userInfo = JSON.parse(parts['ilc:userInfo']);

                            assert.strictEqual(userInfo.identifier, userIdentifier);
                            assert.strictEqual(userInfo.role, 'admin');
                        });

                    // respect session cookie
                    await agent.get('/protected').expect(200, 'ok');

                    // correctly logout
                    await agent.get('/auth/logout').expect(302);
                    await agent.get('/protected').expect(401);
                });

                describe('Roles', () => {
                    it('should provide correct access for "admin"', async () => {
                        const res = await agent.get('/auth/openid');
                        await agent.get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`);

                        await agent.get('/protected').expect(200, 'ok');

                        await agent.post('/protected').expect(200, 'ok');

                        await agent.put('/protected').expect(200, 'ok');

                        await agent.delete('/protected').expect(200, 'ok');
                    });

                    it('should provide correct access for "readonly"', async () => {
                        await db('auth_entities').where('identifier', userIdentifier).update({
                            role: 'readonly',
                        });

                        const res = await agent.get('/auth/openid');
                        await agent.get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`);

                        await agent.get('/protected').expect(200, 'ok');

                        await agent.post('/protected').expect(403, generateResp403(userIdentifier));

                        await agent.put('/protected').expect(403, generateResp403(userIdentifier));

                        await agent.delete('/protected').expect(403, generateResp403(userIdentifier));
                    });

                    it('in case multiple auth entities provide one with highest privileges', async () => {
                        nock.cleanAll();
                        oidcServer = nock('https://ad.example.doesnotmatter.com/').persist();

                        oidcServer
                            .get('/adfs/.well-known/openid-configuration')
                            .reply(200, fs.readFileSync(__dirname + '/data/auth/openid-configuration.json'));
                        tokenEndpoint = oidcServer.post('/adfs/oauth2/token/').reply(
                            200,
                            JSON.stringify({
                                ...token,
                                id_token: generateIdToken([readonlyIdentifier, userIdentifier, readonlyIdentifier]),
                            }),
                        );
                        oidcServer.get('/adfs/discovery/keys').reply(200, JSON.stringify(keys));

                        const res = await agent.get('/auth/openid');
                        await agent.get(`/auth/openid/return?${getQueryOfCodeAndSessionState(res.header['location'])}`);

                        await agent.get('/protected').expect(200, 'ok');
                        await agent.post('/protected').expect(200, 'ok');
                        await agent.put('/protected').expect(200, 'ok');
                        await agent.delete('/protected').expect(200, 'ok');
                    });
                });
            });
        });
    });
});
