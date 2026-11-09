import crypto from 'node:crypto';
import LZUTF8 from 'lzutf8';
import supertest, { agent as supertestAgent, type Agent } from 'supertest';

import type { Application } from 'express';

import app from '../server/app';
import type { OverrideConfigSigningConfig } from '../server/overrideConfig/interfaces';
import { SettingKeys } from '../server/settings/interfaces';
import { db, expect, requestWithAuth, settingsService } from './common';

const url = '/api/v1/override-config/sign';
const rootToken = `Bearer ${Buffer.from('root_api_token').toString('base64')}:${Buffer.from('token_secret').toString('base64')}`;

function generateKeyPair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    return {
        privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    };
}

function signingConfig(overrides: Partial<OverrideConfigSigningConfig> = {}): OverrideConfigSigningConfig {
    return { ttlSeconds: 8 * 60 * 60, activeKeyId: null, privateKeys: null, rateLimitPerMinute: 60, ...overrides };
}

const override = { apps: { '@portal/ncTestOverride': { spaBundle: 'http://localhost:8080/app.js' } } };
const plainValue = encodeURIComponent(JSON.stringify(override));
const lzutf8Value = `LZUTF8:${LZUTF8.compress(JSON.stringify(override), { outputEncoding: 'Base64' })}`;

function verify(signature: string, value: string, publicPem: string) {
    const [encodedHeader, detachedPayload, encodedSignature] = signature.split('.');
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    const isValid = crypto.verify(
        null,
        Buffer.from(`${encodedHeader}.${value}`),
        publicPem,
        Buffer.from(encodedSignature, 'base64url'),
    );
    return { header, detachedPayload, isValid };
}

describe(url, () => {
    const k1 = generateKeyPair();
    const k2 = generateKeyPair();
    let req: Agent;
    let signingApp: Application;

    describe('when signing is not configured', () => {
        beforeEach(async () => {
            req = await requestWithAuth();
        });

        it('answers 404 to a sign request', async () => {
            const response = await req.post(url).set('Authorization', rootToken).send({ value: plainValue });
            expect(response.status).to.equal(404);
            expect(response.text).to.include('not configured');
        });

        it('serves no public keys with the config', async () => {
            const response = await req.get('/api/v1/config').expect(200);
            expect(response.body.settings).to.not.have.property('overrideConfigSigningPublicKeys');
        });
    });

    describe('when signing is configured', () => {
        const privateKeys = { k1: k1.privatePem, k2: k2.privatePem };

        beforeEach(async () => {
            signingApp = await app(db, true, {
                overrideConfigSigning: signingConfig({ activeKeyId: 'k2', privateKeys }),
            });
            req = supertest(signingApp);
        });

        it('refuses to start with an active key that is not configured', async () => {
            await expect(
                app(db, true, { overrideConfigSigning: signingConfig({ activeKeyId: 'k3', privateKeys }) }),
            ).to.be.rejectedWith('"k3" is active but not among the configured keys');
        });

        it('serves every public key with the config, so a rotation stays verifiable', async () => {
            const response = await req.get('/api/v1/config').expect(200);
            expect(response.body.settings.overrideConfigSigningPublicKeys).to.deep.equal([
                { kid: 'k1', publicKey: k1.publicPem },
                { kid: 'k2', publicKey: k2.publicPem },
            ]);
        });

        it('requires authentication', async () => {
            await req.post(url).send({ value: plainValue }).expect(401);
        });

        it('signs a plain value with the active key for a bearer user', async () => {
            const before = Date.now();
            const response = await req
                .post(url)
                .set('Authorization', rootToken)
                .send({ value: plainValue })
                .expect(200);

            const { signature, expiresAt } = response.body;
            const { header, detachedPayload, isValid } = verify(signature, plainValue, k2.publicPem);
            expect(isValid).to.be.true;
            expect(detachedPayload).to.equal('');
            expect(header).to.include({ alg: 'EdDSA', kid: 'k2', b64: false, sub: 'root_api_token' });
            expect(header.crit).to.deep.equal(['b64']);
            expect(header.exp * 1000).to.equal(new Date(expiresAt).getTime());
            expect(new Date(expiresAt).getTime()).to.be.within(
                before + 8 * 3600 * 1000 - 5000,
                Date.now() + 8 * 3600 * 1000,
            );
            expect(verify(signature, plainValue, k1.publicPem).isValid).to.be.false;
        });

        it('signs an LZUTF8 value', async () => {
            const response = await req
                .post(url)
                .set('Authorization', rootToken)
                .send({ value: lzutf8Value })
                .expect(200);
            expect(verify(response.body.signature, lzutf8Value, k2.publicPem).isValid).to.be.true;
        });

        it('signs for a read-only user logged in with a session', async () => {
            const agent = supertestAgent(signingApp);
            await agent.post('/auth/local').send({ username: 'readonly', password: 'pwd' }).expect(200);
            try {
                const response = await agent.post(url).send({ value: plainValue }).expect(200);
                expect(verify(response.body.signature, plainValue, k2.publicPem).header.sub).to.equal('readonly');
            } finally {
                await agent.get('/auth/logout').expect(302);
            }
        });

        it('answers 422 to a value that is not an object', async () => {
            const response = await req
                .post(url)
                .set('Authorization', rootToken)
                .send({ value: encodeURIComponent('[1]') })
                .expect(422);
            expect(response.text).to.include('must be a JSON object');

            const undecodable = await req
                .post(url)
                .set('Authorization', rootToken)
                .send({ value: '%E0%A4%A' })
                .expect(422);
            expect(undecodable.text).to.include('URI-encoded JSON');
        });

        it('answers 422 to unknown top-level keys', async () => {
            const value = encodeURIComponent(JSON.stringify({ ...override, settings: {} }));
            const response = await req.post(url).set('Authorization', rootToken).send({ value }).expect(422);
            expect(response.text).to.include('got settings');
        });

        it('answers 422 with the size to a value that does not fit the cookie', async () => {
            const value = encodeURIComponent(JSON.stringify({ apps: { a: { spaBundle: 'x'.repeat(4100) } } }));
            const response = await req.post(url).set('Authorization', rootToken).send({ value }).expect(422);
            expect(response.text).to.match(/would be \d+ bytes with its name, the browser limit is 4096/);
        });

        it('signs links to untrusted hosts and lists each of them once', async () => {
            const value = encodeURIComponent(
                JSON.stringify({
                    apps: {
                        '@portal/ncTestOverride': {
                            spaBundle: 'https://evil.example/app.js',
                            cssBundle: 'https://evil.example/app.js',
                            ssr: { src: 'http://localhost:3000/' },
                        },
                    },
                    sharedLibs: { lib: { spaBundle: 'https://cdn.example/lib.js' } },
                    routes: [{ slots: { body: { props: { script: 'https://evil.example/slot.js' } } } }],
                }),
            );
            const response = await req.post(url).set('Authorization', rootToken).send({ value }).expect(200);
            expect(verify(response.body.signature, value, k2.publicPem).isValid).to.be.true;
            expect(response.body.untrustedLinks).to.deep.equal([
                'https://evil.example/app.js',
                'https://cdn.example/lib.js',
                'https://evil.example/slot.js',
            ]);
        });

        it('lists no untrusted links when every link is trusted', async () => {
            const response = await req
                .post(url)
                .set('Authorization', rootToken)
                .send({ value: plainValue })
                .expect(200);
            expect(response.body.untrustedLinks).to.deep.equal([]);
        });

        it('lists no untrusted links when every origin is trusted', async () => {
            const previous = await settingsService.get(SettingKeys.OverrideConfigTrustedOrigins);
            await settingsService.set(SettingKeys.OverrideConfigTrustedOrigins, 'all', undefined);
            try {
                const value = encodeURIComponent(
                    JSON.stringify({
                        apps: { '@portal/ncTestOverride': { spaBundle: 'https://evil.example/app.js' } },
                    }),
                );
                const response = await req.post(url).set('Authorization', rootToken).send({ value }).expect(200);
                expect(response.body.untrustedLinks).to.deep.equal([]);
            } finally {
                await settingsService.set(SettingKeys.OverrideConfigTrustedOrigins, previous ?? '', undefined);
            }
        });

        it('answers 422 to a malformed body', async () => {
            await req.post(url).set('Authorization', rootToken).send({ value: '' }).expect(422);
            await req.post(url).set('Authorization', rootToken).send({ value: plainValue, extra: 1 }).expect(422);
        });

        it('answers 429 over the per-user limit', async () => {
            const limited = supertest(
                await app(db, true, {
                    overrideConfigSigning: signingConfig({ activeKeyId: 'k1', privateKeys, rateLimitPerMinute: 2 }),
                }),
            );
            await limited.post(url).set('Authorization', rootToken).send({ value: plainValue }).expect(200);
            await limited.post(url).set('Authorization', rootToken).send({ value: plainValue }).expect(200);
            const response = await limited.post(url).set('Authorization', rootToken).send({ value: plainValue });
            expect(response.status).to.equal(429);
            expect(response.text).to.include('root_api_token');
        });
    });
});
