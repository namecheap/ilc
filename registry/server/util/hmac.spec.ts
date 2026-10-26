import { expect } from 'chai';
import config from 'config';
import { createHmac } from 'node:crypto';
import { appendDigest } from './hmac';

describe('appendDigest', () => {
    it('should append a 32 character base64url digest to the value', () => {
        expect(appendDigest(123, 'template')).to.match(/^123\.[-_0-9a-zA-Z]{32}$/);
        expect(appendDigest('abc', 'app')).to.match(/^abc\.[-_0-9a-zA-Z]{32}$/);
    });

    it('should return the same digest for the same value and kind', () => {
        expect(appendDigest(123, 'template')).to.equal(appendDigest(123, 'template'));
        expect(appendDigest(123, 'template')).to.equal(appendDigest('123', 'template'));
    });

    it('should return different digests for different kinds', () => {
        expect(appendDigest(123, 'template')).not.to.equal(appendDigest(123, 'app'));
    });

    it('should return different digests for different values', () => {
        expect(appendDigest(123, 'template')).not.to.equal(appendDigest(124, 'template'));
    });

    it('should use 0 for null and undefined', () => {
        expect(appendDigest(null, 'route')).to.equal(appendDigest(0, 'route'));
        expect(appendDigest(undefined, 'route')).to.equal(appendDigest(0, 'route'));
        expect(appendDigest(null, 'route')).to.match(/^0\./);
    });

    it('should sign the kind and value with the configured salt', () => {
        const salt = config.get<string>('salt');
        const digest = createHmac('sha256', salt).update('template123').digest('base64url').substring(0, 32);
        const unsalted = createHmac('sha256', '').update('template123').digest('base64url').substring(0, 32);

        expect(appendDigest(123, 'template')).to.equal(`123.${digest}`);
        expect(digest).not.to.equal(unsalted);
    });
});
