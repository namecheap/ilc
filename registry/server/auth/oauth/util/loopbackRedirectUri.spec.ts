import { expect } from 'chai';
import { isLoopbackRedirectUri } from './loopbackRedirectUri';

describe('isLoopbackRedirectUri', () => {
    it('accepts http on the loopback addresses and localhost, on any port and path', () => {
        for (const uri of [
            'http://127.0.0.1:8765/callback',
            'http://127.0.0.1/callback',
            'http://127.0.0.1:51234/',
            'http://[::1]:8765/callback',
            'http://localhost:8765/callback',
            'http://localhost:8765/callback?from=cli',
        ]) {
            expect(isLoopbackRedirectUri(uri), uri).to.be.true;
        }
    });

    it('refuses other hosts, schemes, fragments and malformed values', () => {
        for (const uri of [
            'https://127.0.0.1:8765/callback',
            'http://127.0.0.2:8765/callback',
            'http://localhost.evil.com/callback',
            'http://registry.example.com/callback',
            'http://127.0.0.1:8765/callback#fragment',
            'ilc-cli://callback',
            'not a url',
            '',
        ]) {
            expect(isLoopbackRedirectUri(uri), uri).to.be.false;
        }
    });
});
