import { createHmac } from 'node:crypto';
import config from 'config';

const salt = config.get<string>('salt');

/**
 * This function appends a digest using HMAC-SHA256 algorithm.
 * Example: appendDigest(123, 'template') => '123.K3b...Xa9'
 */
export function appendDigest(
    value: { toString: () => string } | null | undefined,
    kind: 'app' | 'authEntities' | 'route' | 'routerDomains' | 'sharedLib' | 'sharedProp' | 'template'): string {
    const string = value === null || value === undefined ? "0" : value.toString();
    const hasher = createHmac('sha256', salt);
    const digest = hasher.update(`${kind}${string}`).digest('base64url').substring(0, 32);
    return `${string}.${digest}`;
}
