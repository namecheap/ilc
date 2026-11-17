import { expect } from 'chai';
import { computeCodeChallenge, generateAuthorizationCode, hashAuthorizationCode, verifyCodeChallenge } from './pkce';

describe('pkce', () => {
    // RFC 7636 appendix B
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    it('computes the S256 challenge of the RFC example', () => {
        expect(computeCodeChallenge(verifier)).to.equal(challenge);
    });

    it('accepts the verifier of a challenge and refuses any other', () => {
        expect(verifyCodeChallenge(verifier, challenge)).to.be.true;
        expect(verifyCodeChallenge(`${verifier}x`, challenge)).to.be.false;
        expect(verifyCodeChallenge(verifier, challenge.slice(0, -1))).to.be.false;
        expect(verifyCodeChallenge(verifier, '')).to.be.false;
    });

    it('generates distinct codes and hashes them to 64 hex characters', () => {
        const code = generateAuthorizationCode();
        expect(code).to.not.equal(generateAuthorizationCode());
        expect(hashAuthorizationCode(code)).to.match(/^[0-9a-f]{64}$/);
        expect(hashAuthorizationCode(code)).to.equal(hashAuthorizationCode(code));
    });
});
