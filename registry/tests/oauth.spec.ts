import crypto from 'node:crypto';
import path from 'node:path';
import type { Application } from 'express';
import type { Knex } from 'knex';
import config from 'config';
import supertest, { agent as supertestAgent, type Agent, type Response, type Test } from 'supertest';

import app from '../server/app';
import { OAUTH_CLI_CLIENT_ID } from '../server/auth/oauth/interfaces';
import { computeCodeChallenge } from '../server/auth/oauth/util/pkce';
import { unsignSessionToken } from '../server/auth/session/sessionTokenSignature';
import { SESSION_COOKIE_NAME } from '../server/auth/session/sessionConfig';
import { Tables } from '../server/db/structure';
import { SettingKeys } from '../server/settings/interfaces';
import { dbFactory, expect } from './common';

const redirectUri = 'http://127.0.0.1:8765/callback';
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = computeCodeChallenge(codeVerifier);
const signUrl = '/api/v1/override-config/sign';
const override = { apps: { '@portal/ncTestOverride': { spaBundle: 'http://localhost:8080/app.js' } } };
const overrideValue = encodeURIComponent(JSON.stringify(override));

function authorizeQuery(overrides: Record<string, string | undefined> = {}): Record<string, string> {
    const query: Record<string, string | undefined> = {
        response_type: 'code',
        client_id: OAUTH_CLI_CLIENT_ID,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: 'state-123',
        ...overrides,
    };
    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as Record<
        string,
        string
    >;
}

function location(response: Response): URL {
    expect(response.status, response.text).to.equal(302);
    return new URL(response.headers.location, 'http://registry.test');
}

/** The route and query of a redirect to the admin UI, which uses hash routing: `/#/login?returnTo=...` */
function spaRoute(redirect: URL): { route: string; query: URLSearchParams } {
    expect(redirect.origin + redirect.pathname).to.equal('http://registry.test/');
    const [route, query = ''] = redirect.hash.slice(1).split('?');
    return { route, query: new URLSearchParams(query) };
}

/** The session id of a token, `s:<sid>.<signature>` */
function sidOf(token: string): string {
    return token.slice('s:'.length, token.lastIndexOf('.'));
}

describe('OAuth login', () => {
    let db: Knex;
    let reset: () => Promise<void>;
    let application: Application;

    before(async () => {
        ({ db, reset } = await dbFactory());
        await db.migrate.latest({ directory: path.join(__dirname, '../server/migrations') });

        const { privateKey } = crypto.generateKeyPairSync('ed25519');
        application = await app(db, true, {
            overrideConfigSigning: {
                ttlSeconds: 3600,
                activeKeyId: 'k1',
                privateKeys: { k1: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() },
                rateLimitPerMinute: 60,
            },
        });
    });

    after(async () => {
        await reset();
    });

    async function signIn(username = 'root', password = 'pwd'): Promise<Agent> {
        const agent = supertestAgent(application);
        await agent.post('/auth/local').send({ username, password }).expect(200);
        return agent;
    }

    async function authorize(agent: Agent, query = authorizeQuery()): Promise<{ code: string; state: string | null }> {
        const redirect = location(await agent.get('/oauth/authorize').query(query));
        expect(redirect.origin + redirect.pathname).to.equal(redirectUri);
        expect(redirect.searchParams.get('error')).to.be.null;
        const code = redirect.searchParams.get('code');
        expect(code).to.be.a('string').and.not.empty;
        return { code: code!, state: redirect.searchParams.get('state') };
    }

    function requestToken(code: string, overrides: Record<string, string> = {}): Test {
        return supertest(application)
            .post('/oauth/token')
            .type('form')
            .send({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: OAUTH_CLI_CLIENT_ID,
                code_verifier: codeVerifier,
                ...overrides,
            });
    }

    async function login(scope?: string, username = 'root'): Promise<string> {
        const agent = await signIn(username);
        const { code } = await authorize(agent, authorizeQuery({ scope }));
        const response = await requestToken(code).expect(200);
        return response.body.access_token;
    }

    describe('session value contract with express-session', () => {
        it('unsigns a cookie express-session issued and finds its row', async () => {
            const response = await supertest(application)
                .post('/auth/local')
                .send({ username: 'root', password: 'pwd' });
            expect(response.status).to.equal(200);
            const setCookie: string[] = response.get('Set-Cookie') ?? [];
            const raw = setCookie.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
            expect(raw, 'the login sets the session cookie').to.be.a('string');
            const value = decodeURIComponent(raw!.slice(SESSION_COOKIE_NAME.length + 1).split(';')[0]);

            const sid = unsignSessionToken(value, [config.get<string>('auth.sessionSecret')]);
            expect(sid, 'our unsigner accepts what express-session signed').to.be.a('string');
            const row = await db('sessions').where({ sid: sid! }).first();
            expect(row.sess.passport.user.identifier).to.equal('root');

            // an unscoped browser session is not an API token: only sessions the token endpoint issued are
            await supertest(application).get('/api/v1/app').set('Authorization', `Bearer ${value}`).expect(401);
        });
    });

    it('serves the authorization server metadata', async () => {
        const response = await supertest(application).get('/.well-known/oauth-authorization-server').expect(200);
        const issuer = response.body.issuer;
        expect(issuer).to.match(/^http:\/\/127\.0\.0\.1:\d+$/);
        expect(response.body).to.deep.include({
            authorization_endpoint: `${issuer}/oauth/authorize`,
            token_endpoint: `${issuer}/oauth/token`,
            revocation_endpoint: `${issuer}/oauth/revoke`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none'],
            scopes_supported: ['override:sign', 'registry:read', 'registry:write'],
        });
    });

    describe('round trip', () => {
        it('authorizes a signed-in user, exchanges the code, uses, limits and revokes the token', async () => {
            const agent = await signIn();
            const { code, state } = await authorize(agent);
            expect(state).to.equal('state-123');

            const tokenResponse = await requestToken(code).expect(200).expect('Cache-Control', 'no-store');
            expect(tokenResponse.body).to.deep.include({ token_type: 'Bearer', scope: 'override:sign' });
            expect(tokenResponse.body.expires_in).to.equal(8 * 60 * 60);
            const token: string = tokenResponse.body.access_token;
            expect(token).to.match(/^s:[A-Za-z0-9_-]{32}\.[A-Za-z0-9+/]+$/);

            const row = await db('sessions')
                .where({ sid: sidOf(token) })
                .first();
            expect(row.sess.passport.user).to.deep.equal({ authEntityId: 1, identifier: 'root', role: 'admin' });
            expect(row.sess.scopes).to.deep.equal(['override:sign']);
            expect(row.sess.client).to.equal(OAUTH_CLI_CLIENT_ID);
            expect(row.sess.cookie).to.include({ originalMaxAge: 8 * 60 * 60 * 1000, httpOnly: true, path: '/' });
            expect(Date.parse(row.sess.absoluteExpiresAt)).to.be.closeTo(Date.now() + 8 * 60 * 60 * 1000, 5000);

            const bearer = `Bearer ${token}`;
            const signed = await supertest(application)
                .post(signUrl)
                .set('Authorization', bearer)
                .send({ value: overrideValue })
                .expect(200);
            expect(signed.body.signature).to.be.a('string');

            const refused = await supertest(application).get('/api/v1/app').set('Authorization', bearer).expect(403);
            expect(refused.body.message).to.equal(
                'Access denied. The session is limited to "override:sign", "registry:read" is required.',
            );

            await supertest(application).post('/oauth/revoke').type('form').send({ token }).expect(200);
            await supertest(application).post('/oauth/revoke').type('form').send({ token }).expect(200);
            await supertest(application)
                .post(signUrl)
                .set('Authorization', bearer)
                .send({ value: overrideValue })
                .expect(401);
        });

        it('limits a registry:read token to reads', async () => {
            const token = await login('registry:read');
            const bearer = `Bearer ${token}`;

            await supertest(application).get('/api/v1/app').set('Authorization', bearer).expect(200);
            const write = await supertest(application).post('/api/v1/app').set('Authorization', bearer).send({});
            expect(write.status).to.equal(403);
            expect(write.body.message).to.include('"registry:write" is required');
            const sign = await supertest(application)
                .post(signUrl)
                .set('Authorization', bearer)
                .send({ value: overrideValue });
            expect(sign.status).to.equal(403);
            expect(sign.body.message).to.include('"override:sign" is required');
        });

        it('never lets a scope exceed the role', async () => {
            const token = await login('registry:read registry:write', 'readonly');
            const bearer = `Bearer ${token}`;

            await supertest(application).get('/api/v1/app').set('Authorization', bearer).expect(200);
            await supertest(application)
                .post('/api/v1/app')
                .set('Authorization', bearer)
                .send({})
                .expect(403, { message: 'Access denied. "readonly" has "readonly" access.' });
        });

        it('applies the scopes when the token is used as the session cookie', async () => {
            const token = await login('registry:read');
            const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;

            await supertest(application).get('/api/v1/app').set('Cookie', cookie).expect(200);
            const write = await supertest(application).post('/api/v1/app').set('Cookie', cookie).send({});
            expect(write.status).to.equal(403);
            expect(write.body.message).to.include('"registry:write" is required');

            // and a scoped session cannot start a new authorization with more scopes
            const refused = await supertest(application)
                .get('/oauth/authorize')
                .query(authorizeQuery({ scope: 'registry:write' }))
                .set('Cookie', cookie);
            const { route, query } = spaRoute(location(refused));
            expect(route).to.equal('/oauth/error');
            expect(query.get('error')).to.equal('access_denied');
        });

        it('refuses a token past its absolute expiry and does not extend the row', async () => {
            const token = await login('registry:read');
            const sid = sidOf(token);
            const before = await db('sessions').where({ sid }).first();

            await supertest(application).get('/api/v1/app').set('Authorization', `Bearer ${token}`).expect(200);
            const after = await db('sessions').where({ sid }).first();
            expect(after.expired.getTime()).to.equal(before.expired.getTime());

            await db('sessions')
                .where({ sid })
                .update({ sess: { ...before.sess, absoluteExpiresAt: new Date(Date.now() - 1000).toISOString() } });
            await supertest(application).get('/api/v1/app').set('Authorization', `Bearer ${token}`).expect(401);
            await supertest(application)
                .get('/api/v1/app')
                .set('Cookie', `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`)
                .expect(401);
        });

        it('refuses a tampered or unknown session token', async () => {
            const token = await login();
            await supertest(application)
                .post(signUrl)
                .set('Authorization', `Bearer ${token}x`)
                .send({ value: overrideValue })
                .expect(401);
            await supertest(application)
                .post(signUrl)
                .set('Authorization', `Bearer s:${sidOf(token)}.bm90IGEgc2lnbmF0dXJl`)
                .send({ value: overrideValue })
                .expect(401);
        });
    });

    describe('token endpoint', () => {
        it('refuses a wrong verifier', async () => {
            const { code } = await authorize(await signIn());
            const response = await requestToken(code, { code_verifier: `${codeVerifier}x` }).expect(400);
            expect(response.body).to.deep.include({ error: 'invalid_grant' });
            expect(response.body.error_description).to.include('code_verifier');
        });

        it('refuses a reused code', async () => {
            const { code } = await authorize(await signIn());
            await requestToken(code).expect(200);
            const response = await requestToken(code).expect(400);
            expect(response.body).to.deep.include({ error: 'invalid_grant' });
        });

        it('refuses an expired code', async () => {
            const { code } = await authorize(await signIn());
            await db(Tables.OAuthAuthorizationCodes).update({ expiresAt: new Date(Date.now() - 1000) });
            const response = await requestToken(code).expect(400);
            expect(response.body).to.deep.include({ error: 'invalid_grant' });
            expect(response.body.error_description).to.include('expired');
        });

        it('refuses a redirect URI, client or grant type that does not match', async () => {
            const { code } = await authorize(await signIn());

            let response = await requestToken(code, { grant_type: 'client_credentials' }).expect(400);
            expect(response.body).to.deep.include({ error: 'unsupported_grant_type' });

            response = await requestToken(code, { client_id: 'other' }).expect(401);
            expect(response.body).to.deep.include({ error: 'invalid_client' });

            response = await requestToken(code, { redirect_uri: 'http://127.0.0.1:9999/callback' }).expect(400);
            expect(response.body).to.deep.include({ error: 'invalid_grant' });

            // the mismatch consumed the code
            response = await requestToken(code).expect(400);
            expect(response.body).to.deep.include({ error: 'invalid_grant' });
        });

        it('answers invalid_request to a malformed body', async () => {
            const response = await supertest(application)
                .post('/oauth/token')
                .type('form')
                .send({ grant_type: 'authorization_code' })
                .expect(400);
            expect(response.body).to.deep.include({ error: 'invalid_request' });
        });
    });

    describe('authorize endpoint', () => {
        it('shows the error page for an unknown client or a non-loopback redirect URI, never the client', async () => {
            const agent = await signIn();
            const codesBefore = await db(Tables.OAuthAuthorizationCodes).count().first();

            let response = await agent.get('/oauth/authorize').query(authorizeQuery({ client_id: 'other' }));
            let { route, query } = spaRoute(location(response));
            expect(route).to.equal('/oauth/error');
            expect(query.get('error')).to.equal('invalid_client');
            expect(query.get('error_description')).to.be.a('string').and.not.empty;

            for (const redirect_uri of ['https://127.0.0.1/cb', 'http://evil.example/cb', 'http://localhost/cb#x']) {
                response = await agent.get('/oauth/authorize').query(authorizeQuery({ redirect_uri }));
                ({ route, query } = spaRoute(location(response)));
                expect(route, redirect_uri).to.equal('/oauth/error');
                expect(query.get('error_description'), redirect_uri).to.include('loopback');
            }

            expect(await db(Tables.OAuthAuthorizationCodes).count().first()).to.deep.equal(codesBefore);
        });

        it('redirects the other errors to the client with the state', async () => {
            const agent = await signIn();

            let redirect = location(await agent.get('/oauth/authorize').query(authorizeQuery({ state: undefined })));
            expect(redirect.searchParams.get('error')).to.equal('invalid_request');
            expect(redirect.searchParams.get('error_description')).to.include('state');

            redirect = location(
                await agent.get('/oauth/authorize').query(authorizeQuery({ code_challenge_method: 'plain' })),
            );
            expect(redirect.searchParams.get('error')).to.equal('invalid_request');
            expect(redirect.searchParams.get('state')).to.equal('state-123');

            redirect = location(await agent.get('/oauth/authorize').query(authorizeQuery({ scope: 'registry:admin' })));
            expect(redirect.searchParams.get('error')).to.equal('invalid_scope');
            expect(redirect.searchParams.get('state')).to.equal('state-123');

            redirect = location(
                await agent.get('/oauth/authorize').query(authorizeQuery({ resource: 'https://other.example' })),
            );
            expect(redirect.searchParams.get('error')).to.equal('invalid_target');
        });

        it('accepts the resource that is this registry', async () => {
            // supertest listens on a new port per request, the Host header pins the issuer
            const agent = await signIn();
            const metadata = await agent.get('/.well-known/oauth-authorization-server').set('Host', 'registry.test');
            expect(metadata.body.issuer).to.equal('http://registry.test');

            const redirect = location(
                await agent
                    .get('/oauth/authorize')
                    .query(authorizeQuery({ resource: 'http://registry.test/' }))
                    .set('Host', 'registry.test'),
            );
            expect(redirect.searchParams.get('error')).to.be.null;
            expect(redirect.searchParams.get('code')).to.be.a('string');
        });

        it('shows the error page when there is nothing to continue', async () => {
            const response = await supertest(application).get('/oauth/authorize');
            const { route, query } = spaRoute(location(response));
            expect(route).to.equal('/oauth/error');
            expect(query.get('error')).to.equal('invalid_request');
            expect(query.get('error_description')).to.include('no authorization request to continue');
            await supertest(application).post('/oauth/authorize').type('form').send({}).expect(404);
        });

        it('sends the user through the admin UI login when OpenID is not enabled', async () => {
            const agent = supertestAgent(application);
            const response = await agent.get('/oauth/authorize').query(authorizeQuery({ scope: 'registry:read' }));
            const { route, query } = spaRoute(location(response));
            expect(route).to.equal('/login');
            expect(query.get('returnTo')).to.equal('/oauth/authorize');
            expect(query.get('client')).to.equal(OAUTH_CLI_CLIENT_ID);
            expect(query.get('scope')).to.equal('registry:read');

            // the UI posts the credentials and then navigates to returnTo
            await agent.post('/auth/local').send({ username: 'root', password: 'pwd' }).expect(200);
            const { code, state } = await authorize(agent, {});
            expect(state).to.equal('state-123');
            const tokenResponse = await requestToken(code).expect(200);
            expect(tokenResponse.body.scope).to.equal('registry:read');

            // the request was consumed
            const again = spaRoute(location(await agent.get('/oauth/authorize')));
            expect(again.route).to.equal('/oauth/error');
        });

        it('starts the OpenID login when it is enabled and the request came through the base URL', async () => {
            // The base URL setting has a default, so a Registry always has one; here it names the host of the request
            const baseUrlRow = await db('settings').where({ key: SettingKeys.BaseUrl }).first();
            expect(baseUrlRow, 'the base URL setting row exists').to.not.be.undefined;
            await db('settings').where({ key: SettingKeys.AuthOpenIdEnabled }).update({ value: 'true' });
            await db('settings')
                .where({ key: SettingKeys.BaseUrl })
                .update({ value: JSON.stringify('http://registry.example.test/') });
            try {
                const response = await supertest(application)
                    .get('/oauth/authorize')
                    .set('Host', 'registry.example.test')
                    .query(authorizeQuery());
                expect(location(response).pathname).to.equal('/auth/openid');
            } finally {
                await db('settings').where({ key: SettingKeys.AuthOpenIdEnabled }).update({ value: 'false' });
                await db('settings').where({ key: SettingKeys.BaseUrl }).update({ value: baseUrlRow!.value });
            }
        });

        it('moves to the configured base URL before the OpenID login when it came through another host', async () => {
            const baseUrlRow = await db('settings').where({ key: SettingKeys.BaseUrl }).first();
            expect(baseUrlRow, 'the base URL setting row exists').to.not.be.undefined;
            await db('settings').where({ key: SettingKeys.AuthOpenIdEnabled }).update({ value: 'true' });
            await db('settings')
                .where({ key: SettingKeys.BaseUrl })
                .update({ value: JSON.stringify('https://registry.example.test/') });
            try {
                const query = authorizeQuery({ scope: 'registry:read' });
                const response = await supertest(application).get('/oauth/authorize').query(query);
                const redirect = location(response);
                expect(redirect.origin).to.equal('https://registry.example.test');
                expect(redirect.pathname).to.equal('/oauth/authorize');
                expect(Object.fromEntries(redirect.searchParams)).to.deep.equal(query);
                // nothing is kept for a host the callback will not come back to
                expect(response.headers['set-cookie']).to.be.undefined;
            } finally {
                await db('settings').where({ key: SettingKeys.AuthOpenIdEnabled }).update({ value: 'false' });
                await db('settings').where({ key: SettingKeys.BaseUrl }).update({ value: baseUrlRow!.value });
            }
        });
    });
});
