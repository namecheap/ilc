import { generateKeyPairSync, createPublicKey } from 'node:crypto';

const { privateKey, publicKey: pemPublicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
    },
});

const publicKey = createPublicKey(pemPublicKey).export({ format: 'jwk' });

export { privateKey, publicKey };
