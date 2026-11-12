import crypto from 'node:crypto';
import { expect } from 'chai';
import sinon from 'sinon';
import LZUTF8 from 'lzutf8';
import { parseOverrideConfig } from './parse-override-config';
import { verifyOverrideSignature, type OverrideConfigSigningPublicKey } from './verify-override-signature';

function generateKey(kid: string) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    return {
        kid,
        privateKey,
        setting: { kid, publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString() },
    };
}

type Key = ReturnType<typeof generateKey>;

const override = { apps: { '@portal/one': { spaBundle: 'http://localhost:8080/x.js' } } };
const plainValue = encodeURIComponent(JSON.stringify(override));
const lzutf8Value = `LZUTF8:${LZUTF8.compress(JSON.stringify(override), { outputEncoding: 'Base64' })}`;

function sign(
    key: Key,
    value: string,
    headerOverrides: Record<string, unknown> = {},
    { tamperedHeader }: { tamperedHeader?: Record<string, unknown> } = {},
): string {
    const header = {
        alg: 'EdDSA',
        kid: key.kid,
        b64: false,
        crit: ['b64'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'developer',
        ...headerOverrides,
    };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const signature = crypto.sign(null, Buffer.from(`${encodedHeader}.${value}`), key.privateKey).toString('base64url');
    const sentHeader = tamperedHeader
        ? Buffer.from(JSON.stringify({ ...header, ...tamperedHeader })).toString('base64url')
        : encodedHeader;

    return `${sentHeader}..${signature}`;
}

function cookieHeader(value: string | null, signature: string | null): string {
    return [
        signature === null ? null : `ILC-overrideConfigSignature=${signature}`,
        value === null ? null : `ILC-overrideConfig=${value}`,
    ]
        .filter((pair) => pair !== null)
        .join('; ');
}

describe('verify-override-signature', () => {
    let key: Key;
    let keys: OverrideConfigSigningPublicKey[];
    let logger: { warn: sinon.SinonSpy };

    beforeEach(() => {
        key = generateKey('k1');
        keys = [key.setting];
        logger = { warn: sinon.spy() };
    });

    function parse(cookie: string, publicKeys: OverrideConfigSigningPublicKey[] = keys) {
        return parseOverrideConfig(cookie, undefined, logger, publicKeys);
    }

    it('applies an unsigned override when no keys are configured', () => {
        expect(parseOverrideConfig(cookieHeader(plainValue, null), undefined, logger)).to.deep.equal(override);
        expect(parse(cookieHeader(plainValue, null), [])).to.deep.equal(override);
        expect(logger.warn.called).to.be.false;
    });

    it('applies a signed override with the plain encoding', () => {
        expect(parse(cookieHeader(plainValue, sign(key, plainValue)))).to.deep.equal(override);
        expect(logger.warn.called).to.be.false;
    });

    it('applies a signed override with the LZUTF8 encoding', () => {
        expect(parse(cookieHeader(lzutf8Value, sign(key, lzutf8Value)))).to.deep.equal(override);
    });

    it('finds the override cookie whichever order the cookies come in', () => {
        const signature = sign(key, plainValue);
        expect(parse(`ILC-overrideConfig=${plainValue}; ILC-overrideConfigSignature=${signature}`)).to.deep.equal(
            override,
        );
        expect(parse(`ILC-overrideConfigSignature=${signature}; ILC-overrideConfig=${plainValue}`)).to.deep.equal(
            override,
        );
    });

    it('ignores an override without a signature cookie', () => {
        expect(parse(cookieHeader(plainValue, null))).to.equal(null);
        expect(logger.warn.firstCall.args[0]).to.include('unsigned');
    });

    it('ignores a signature without an override cookie', () => {
        expect(parse(cookieHeader(null, sign(key, plainValue)))).to.equal(null);
        expect(logger.warn.called).to.be.false;
    });

    it('ignores a signature made over a different value', () => {
        const other = encodeURIComponent(JSON.stringify({ apps: { '@portal/two': {} } }));
        expect(parse(cookieHeader(plainValue, sign(key, other)))).to.equal(null);
        expect(logger.warn.firstCall.args[0]).to.include('bad signature').and.include('sub = developer');
    });

    it('ignores a signature with a tampered expiry', () => {
        const signature = sign(key, plainValue, {}, { tamperedHeader: { exp: Math.floor(Date.now() / 1000) + 86400 } });
        expect(parse(cookieHeader(plainValue, signature))).to.equal(null);
        expect(logger.warn.firstCall.args[0]).to.include('bad signature');
    });

    it('ignores a signature from an unknown key', () => {
        const otherKey = generateKey('k2');
        expect(parse(cookieHeader(plainValue, sign(otherKey, plainValue)))).to.equal(null);
        expect(logger.warn.firstCall.args[0]).to.include('unknown key "k2"');
    });

    it('ignores a signature whose header is not pinned', () => {
        for (const headerOverrides of [
            { alg: 'none' },
            { alg: 'HS256' },
            { b64: true },
            { crit: [] },
            { crit: ['b64', 'x'] },
        ]) {
            expect(parse(cookieHeader(plainValue, sign(key, plainValue, headerOverrides)))).to.equal(null);
        }
        expect(parse(cookieHeader(plainValue, sign(key, plainValue, { kid: 1 })))).to.equal(null);
        expect(parse(cookieHeader(plainValue, sign(key, plainValue, { exp: 'soon' })))).to.equal(null);
        expect(logger.warn.callCount).to.equal(7);
    });

    it('ignores a signature that is not a detached compact JWS', () => {
        expect(parse(cookieHeader(plainValue, 'not-a-jws'))).to.equal(null);
        expect(parse(cookieHeader(plainValue, 'a.b.c'))).to.equal(null);
        expect(parse(cookieHeader(plainValue, `${Buffer.from('[]').toString('base64url')}..c`))).to.equal(null);
    });

    it('ignores an expired signature but tolerates 60 seconds of skew', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(parse(cookieHeader(plainValue, sign(key, plainValue, { exp: now - 120 })))).to.equal(null);
        expect(logger.warn.firstCall.args[0]).to.include('expired').and.include('sub = developer');
        expect(parse(cookieHeader(plainValue, sign(key, plainValue, { exp: now - 30 })))).to.deep.equal(override);
    });

    it('verifies with any key of the list', () => {
        const secondKey = generateKey('k2');
        const bothKeys = [key.setting, secondKey.setting];
        expect(parse(cookieHeader(plainValue, sign(secondKey, plainValue)), bothKeys)).to.deep.equal(override);
        expect(parse(cookieHeader(plainValue, sign(key, plainValue)), bothKeys)).to.deep.equal(override);
    });

    it('rejects a configured key that is not an Ed25519 public key', () => {
        const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const rsaKeys = [{ kid: 'k1', publicKey: rsa.publicKey.export({ type: 'spki', format: 'pem' }).toString() }];
        expect(verifyOverrideSignature(cookieHeader(plainValue, sign(key, plainValue)), plainValue, rsaKeys, logger)).to
            .be.false;
        expect(
            verifyOverrideSignature(
                cookieHeader(plainValue, sign(key, plainValue)),
                plainValue,
                [{ kid: 'k1', publicKey: 'garbage' }],
                logger,
            ),
        ).to.be.false;
        expect(logger.warn.callCount).to.equal(2);
    });
});
