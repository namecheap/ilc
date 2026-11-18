import { expect } from 'chai';
import crypto from 'node:crypto';
import { normalizePem } from './OverrideConfigSigningService';

describe('overrideConfig/OverrideConfigSigningService', () => {
    describe('normalizePem', () => {
        const { privateKey } = crypto.generateKeyPairSync('ed25519');
        const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

        it('keeps a well-formed PEM loadable', () => {
            expect(crypto.createPrivateKey(normalizePem(pem)).asymmetricKeyType).to.equal('ed25519');
        });

        it('restores the line breaks of a PEM flattened to one line, as an environment variable may carry it', () => {
            const flattened = pem.replace(/\n/g, '');
            expect(() => crypto.createPrivateKey(flattened)).to.throw();

            expect(crypto.createPrivateKey(normalizePem(flattened)).asymmetricKeyType).to.equal('ed25519');
        });

        it('trims surrounding whitespace', () => {
            expect(normalizePem(`  ${pem}  \n`)).to.equal(pem.trim());
        });
    });
});
