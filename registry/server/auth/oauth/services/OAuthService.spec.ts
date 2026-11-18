import { expect } from 'chai';
import { OAuthError, OAuthScope } from '../interfaces';
import { parseScopes } from './OAuthService';

describe('parseScopes', () => {
    it('defaults to override:sign and dedupes', () => {
        expect(parseScopes(undefined)).to.deep.equal([OAuthScope.OverrideSign]);
        expect(parseScopes('')).to.deep.equal([OAuthScope.OverrideSign]);
        expect(parseScopes('registry:read  registry:read registry:write')).to.deep.equal([
            OAuthScope.RegistryRead,
            OAuthScope.RegistryWrite,
        ]);
    });

    it('refuses an unknown scope with invalid_scope', () => {
        expect(() => parseScopes('registry:read admin')).to.throw(OAuthError, 'Unknown scope "admin"');
        try {
            parseScopes('registry:admin');
        } catch (error) {
            expect(error).to.be.instanceOf(OAuthError);
            expect((error as OAuthError).code).to.equal('invalid_scope');
        }
    });
});
