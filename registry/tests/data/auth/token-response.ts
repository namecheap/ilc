import { sign } from 'jsonwebtoken';
import { privateKey } from './rsa';

const accessTokenPayload = {
    aud: 'microsoft:identityserver:test',
    iss: 'https://ad.example.doesnotmatter.com/adfs/services/trust',
    apptype: 'Confidential',
    appid: 'ilc_registry',
    authmethod: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    auth_time: '2024-05-15T12:47:33.196Z',
    ver: '1.0',
    scp: 'email openid',
};

const idTokenPayload = {
    aud: 'ba05c345-e144-4688-b0be-3e1097ddd32d',
    iss: 'https://ad.example.doesnotmatter.com/adfs',
    auth_time: 1715777253,
    sub: 'main-user@namecheap.com',
    upn: 'main-user@namecheap.com',
    email: 'main-user@namecheap.com',
    apptype: 'Confidential',
    appid: 'ba05c345-e144-4688-b0be-3e1097ddd32d',
    authmethod: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    ver: '1.0',
    scp: 'email openid',
};

export function generateJwtToken(payload: object): string {
    return sign(payload, privateKey, { algorithm: 'RS256', expiresIn: 3600 });
}

export function generateIdToken(email: string | string[]): string {
    return generateJwtToken({ ...idTokenPayload, email });
}

export default {
    access_token: generateJwtToken(accessTokenPayload),
    token_type: 'bearer',
    expires_in: 3600,
    resource: 'ba05c345-e144-4688-b0be-3e1097ddd32d',
    refresh_token: '8xLOxBtZp8',
    refresh_token_expires_in: 27920,
    scope: 'email openid',
    id_token: generateJwtToken(idTokenPayload),
};
