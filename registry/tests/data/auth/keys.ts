import { publicKey } from './rsa';

export default {
    keys: [
        {
            kty: 'RSA',
            use: 'sig',
            alg: 'RS256',
            kid: 'test',
            ...publicKey,
        },
    ],
};
