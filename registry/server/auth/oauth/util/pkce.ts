import crypto from 'node:crypto';

/** RFC 7636 section 4.2: BASE64URL(SHA256(code_verifier)) */
export function computeCodeChallenge(codeVerifier: string): string {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const expected = Buffer.from(computeCodeChallenge(codeVerifier));
    const actual = Buffer.from(codeChallenge);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** The table keeps the hash, a leaked table does not leak usable codes */
export function hashAuthorizationCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('base64url');
}
