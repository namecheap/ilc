import crypto from 'node:crypto';
import { expect } from 'chai';
import { isSessionToken, signSessionId, unsignSessionToken } from './sessionTokenSignature';

describe('sessionTokenSignature', () => {
    const sid = 'LM0ZRgK-Z5Kr2hZQd8JXTA2n6CmfNvQa';

    it('signs like express-session: "s:" + sid + "." + HMAC', () => {
        const token = signSessionId(sid, 'secret');
        expect(token).to.match(/^s:LM0ZRgK-Z5Kr2hZQd8JXTA2n6CmfNvQa\.[A-Za-z0-9+/]+$/);
        expect(isSessionToken(token)).to.be.true;
        expect(isSessionToken(sid)).to.be.false;
    });

    it('pins the express-session format: base64 HMAC-SHA256 of the sid without padding', () => {
        // Computed independently of cookie-signature, so a change in that library or in express-session shows up here
        const mac = crypto.createHmac('sha256', 'secret').update(sid).digest('base64').replace(/=+$/, '');
        expect(signSessionId(sid, 'secret')).to.equal(`s:${sid}.${mac}`);
    });

    it('unsigns with any of the secrets and refuses a tampered or foreign token', () => {
        const token = signSessionId(sid, 'old');
        expect(unsignSessionToken(token, ['new', 'old'])).to.equal(sid);
        expect(unsignSessionToken(token, ['new'])).to.be.null;
        expect(unsignSessionToken(`${token}x`, ['old'])).to.be.null;
        expect(unsignSessionToken(`s:${sid}x${token.slice(2 + sid.length)}`, ['old'])).to.be.null;
        expect(unsignSessionToken(sid, ['old'])).to.be.null;
        expect(unsignSessionToken('s:', ['old'])).to.be.null;
    });
});
