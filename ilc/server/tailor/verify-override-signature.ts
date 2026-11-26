import crypto, { type KeyObject } from 'node:crypto';

type Logger = Pick<Console, 'warn'>;

/** One entry of the `overrideConfigSigningPublicKeys` setting the Registry serves */
export interface OverrideConfigSigningPublicKey {
    kid: string;
    /** SPKI PEM */
    publicKey: string;
}

export const OVERRIDE_CONFIG_COOKIE = 'ILC-overrideConfig';
export const OVERRIDE_CONFIG_SIGNATURE_COOKIE = 'ILC-overrideConfigSignature';

const CLOCK_SKEW_SECONDS = 60;
// Enough for every key a rotation keeps around; a bigger map means the setting churns, so it is reset
const KEY_CACHE_LIMIT = 100;

// Parsing a PEM costs more than the verification itself, and the settings object arrives fresh on every request
const keyObjects = new Map<string, KeyObject>();

/** The raw value of the named cookie in a Cookie header, undefined when it is not there */
export function getCookieValue(cookieHeader: unknown, name: string): string | undefined {
    if (typeof cookieHeader !== 'string') {
        return undefined;
    }

    const prefix = `${name}=`;
    const cookie = cookieHeader
        .split(';')
        .map((pair) => pair.trim())
        .find((pair) => pair.startsWith(prefix));

    return cookie?.slice(prefix.length);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getKeyObject(publicKey: string): KeyObject | null {
    const cached = keyObjects.get(publicKey);
    if (cached) {
        return cached;
    }

    try {
        const keyObject = crypto.createPublicKey(publicKey);
        if (keyObject.asymmetricKeyType !== 'ed25519') {
            return null;
        }
        if (keyObjects.size >= KEY_CACHE_LIMIT) {
            keyObjects.clear();
        }
        keyObjects.set(publicKey, keyObject);
        return keyObject;
    } catch {
        return null;
    }
}

/**
 * Verifies the ILC-overrideConfigSignature cookie over the raw value of the ILC-overrideConfig cookie.
 * The signature is a detached compact JWS (RFC 7515 Appendix F) with the unencoded payload option (RFC 7797),
 * signed with EdDSA over Ed25519 (RFC 8037): `BASE64URL(header)..BASE64URL(signature)`, the signature covering
 * `BASE64URL(header) || "." || <override cookie value>`. The header is pinned before any key is looked up,
 * so "alg: none" and the HMAC algorithms are never consulted.
 * Every rejection is logged with its reason and, when the header carries it, the user it was issued to.
 */
export function verifyOverrideSignature(
    cookieHeader: unknown,
    overrideValue: string,
    publicKeys: OverrideConfigSigningPublicKey[],
    logger?: Logger,
): boolean {
    let sub: string | undefined;
    const reject = (reason: string): false => {
        logger?.warn(`Override config ignored: ${reason}${sub === undefined ? '' : `. sub = ${sub}`}`);
        return false;
    };

    const signatureCookie = getCookieValue(cookieHeader, OVERRIDE_CONFIG_SIGNATURE_COOKIE);
    if (!signatureCookie) {
        return reject('unsigned, no signature cookie');
    }

    const parts = signatureCookie.split('.');
    if (parts.length !== 3 || parts[1] !== '') {
        return reject('signature is not a detached compact JWS');
    }
    const [encodedHeader, , encodedSignature] = parts;

    let header: unknown;
    try {
        header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    } catch {
        return reject('signature header is not JSON');
    }
    if (!isPlainObject(header)) {
        return reject('signature header is not an object');
    }
    if (typeof header.sub === 'string') {
        sub = header.sub;
    }

    const isPinnedHeader =
        header.alg === 'EdDSA' &&
        header.b64 === false &&
        Array.isArray(header.crit) &&
        header.crit.length === 1 &&
        header.crit[0] === 'b64';
    if (!isPinnedHeader) {
        return reject('signature header must have alg EdDSA, b64 false and crit ["b64"]');
    }
    if (typeof header.kid !== 'string') {
        return reject('signature header has no kid');
    }
    if (typeof header.exp !== 'number' || !Number.isFinite(header.exp)) {
        return reject('signature header has no numeric exp');
    }

    const kid = header.kid;
    const publicKey = publicKeys.find((key) => key.kid === kid);
    if (!publicKey) {
        return reject(`unknown key "${kid}"`);
    }
    const keyObject = getKeyObject(publicKey.publicKey);
    if (!keyObject) {
        return reject(`public key "${kid}" is not a usable Ed25519 key`);
    }

    let isValid: boolean;
    try {
        isValid = crypto.verify(
            null,
            Buffer.from(`${encodedHeader}.${overrideValue}`),
            keyObject,
            Buffer.from(encodedSignature, 'base64url'),
        );
    } catch {
        isValid = false;
    }
    if (!isValid) {
        return reject('bad signature');
    }

    if (header.exp + CLOCK_SKEW_SECONDS < Date.now() / 1000) {
        return reject('signature expired');
    }

    return true;
}
