import config from 'config';
import crypto, { type KeyObject } from 'node:crypto';
import LZUTF8 from 'lzutf8';

import type { User } from '../../../typings/User';
import { UnprocessableContent } from '../../errorHandler/httpErrors';
import { SettingKeys } from '../../settings/interfaces';
import type { SettingsService } from '../../settings/services/SettingsService';
import { getLogger } from '../../util/logger';
import {
    overrideConfigSigningConfigSchema,
    type OverrideConfigSignature,
    type OverrideConfigSigningConfig,
    type OverrideConfigSigningPublicKey,
} from '../interfaces';
import { collectLinkHosts, findUntrustedLinks, parseTrustedOrigins } from './trustedOrigins';

const COOKIE_NAME = 'ILC-overrideConfig';
/** Chrome's limit per cookie, name and value together */
const COOKIE_SIZE_LIMIT = 4096;
const ALLOWED_TOP_LEVEL_KEYS = ['apps', 'routes', 'sharedLibs'];

interface SigningKey {
    privateKey: KeyObject;
    publicKey: string;
}

/**
 * A PEM key as it survives an environment variable: a `.env` file or a secret store often drops the line breaks, and
 * OpenSSL refuses a header, body and footer on one line. The line breaks around the header and the footer are put
 * back; a long body line is fine.
 */
export function normalizePem(pem: string): string {
    return pem
        .trim()
        .replace(/-----BEGIN ([A-Z ]+)-----\s*/, '-----BEGIN $1-----\n')
        .replace(/\s*-----END ([A-Z ]+)-----/, '\n-----END $1-----');
}

/** Reads the `overrideConfigSigning` config section, a wrong value is a startup error */
export function readOverrideConfigSigningConfig(): OverrideConfigSigningConfig {
    // node-config returns its own immutable objects, whose constructor is not `Object`; Zod's record check accepts
    // plain objects only, so the section is converted back to plain data first
    const section = config.util.toObject(config.get('overrideConfigSigning'));
    const result = overrideConfigSigningConfigSchema.safeParse(section);
    if (!result.success) {
        throw new Error(`Invalid overrideConfigSigning config: ${result.error.message}`);
    }
    return result.data;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Decodes the cookie value the way ILC does: plain URI-encoded JSON or the LZUTF8 encoding */
function decodeOverrideConfig(value: string): unknown {
    try {
        if (value.startsWith('LZUTF8:')) {
            return JSON.parse(LZUTF8.decompress(LZUTF8.decodeBase64(value.slice('LZUTF8:'.length))));
        }
        return JSON.parse(decodeURIComponent(value));
    } catch {
        throw new UnprocessableContent({
            message: 'Override config value must be URI-encoded JSON or an "LZUTF8:" encoded value',
        });
    }
}

/**
 * Signs the ILC-overrideConfig cookie value as a detached compact JWS (RFC 7515 Appendix F) with EdDSA over Ed25519
 * (RFC 8037) and the unencoded payload option (RFC 7797), so the cookie itself stays as it is.
 * Keys come from config; the feature is off while no active key is configured.
 */
export class OverrideConfigSigningService {
    private readonly keys = new Map<string, SigningKey>();

    constructor(
        private readonly config: OverrideConfigSigningConfig,
        private readonly settingsService: SettingsService,
    ) {
        for (const [kid, pem] of Object.entries(config.privateKeys ?? {})) {
            const privateKey = crypto.createPrivateKey(normalizePem(pem));
            if (privateKey.asymmetricKeyType !== 'ed25519') {
                throw new Error(`Override config signing key "${kid}" must be an Ed25519 key`);
            }
            const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
            this.keys.set(kid, { privateKey, publicKey });
        }

        if (config.activeKeyId !== null && !this.keys.has(config.activeKeyId)) {
            throw new Error(
                `Override config signing key "${config.activeKeyId}" is active but not among the configured keys`,
            );
        }
    }

    isConfigured(): boolean {
        return this.config.activeKeyId !== null;
    }

    get rateLimitPerMinute(): number {
        return this.config.rateLimitPerMinute;
    }

    /** Every configured key, the ones kept for verification after a rotation included */
    getPublicKeys(): OverrideConfigSigningPublicKey[] {
        return [...this.keys].map(([kid, { publicKey }]) => ({ kid, publicKey }));
    }

    /**
     * Validates the value as ILC would and signs it with the active key. Links to hosts outside
     * `overrideConfigTrustedOrigins` are signed too, since ILC removes them itself, and reported back so the caller can
     * warn the developer. Logs who signed what.
     */
    async sign(value: string, user: User): Promise<OverrideConfigSignature> {
        const kid = this.config.activeKeyId;
        if (kid === null) {
            throw new Error('Override config signing is not configured');
        }

        const override = this.validate(value);
        const untrustedLinks = await this.findUntrustedLinks(override);
        const exp = Math.floor(Date.now() / 1000) + this.config.ttlSeconds;
        const header = { alg: 'EdDSA', kid, b64: false, crit: ['b64'], exp, sub: user.identifier };
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const signingKey = this.keys.get(kid);
        if (!signingKey) {
            throw new Error(`Override config signing key "${kid}" is missing`);
        }
        const signature = crypto
            .sign(null, Buffer.from(`${encodedHeader}.${value}`), signingKey.privateKey)
            .toString('base64url');

        getLogger().info(
            {
                kid,
                apps: Object.keys(isPlainObject(override.apps) ? override.apps : {}),
                hosts: collectLinkHosts(override),
                untrustedLinks,
            },
            `Override config signed for "${user.identifier}"`,
        );

        return {
            signature: `${encodedHeader}..${signature}`,
            expiresAt: new Date(exp * 1000).toISOString(),
            untrustedLinks,
        };
    }

    private validate(value: string): Record<string, unknown> {
        const size = COOKIE_NAME.length + 1 + value.length;
        if (size > COOKIE_SIZE_LIMIT) {
            throw new UnprocessableContent({
                message: `Override config cookie would be ${size} bytes with its name, the browser limit is ${COOKIE_SIZE_LIMIT}`,
            });
        }

        const override = decodeOverrideConfig(value);
        if (!isPlainObject(override)) {
            throw new UnprocessableContent({ message: 'Override config must be a JSON object' });
        }

        const unknownKeys = Object.keys(override).filter((key) => !ALLOWED_TOP_LEVEL_KEYS.includes(key));
        if (unknownKeys.length) {
            throw new UnprocessableContent({
                message: `Override config may contain only ${ALLOWED_TOP_LEVEL_KEYS.join(', ')}, got ${unknownKeys.join(', ')}`,
            });
        }

        return override;
    }

    /** The distinct links ILC removes from `apps`, `sharedLibs` and `routes` as untrusted, in the order they appear */
    private async findUntrustedLinks(override: Record<string, unknown>): Promise<string[]> {
        const trustedOrigins = await this.settingsService.get<string>(SettingKeys.OverrideConfigTrustedOrigins);
        if (trustedOrigins === 'all') {
            return [];
        }

        const parsedTrustedOrigins = parseTrustedOrigins(trustedOrigins);
        return [
            ...new Set([
                ...findUntrustedLinks(override.apps, parsedTrustedOrigins),
                ...findUntrustedLinks(override.sharedLibs, parsedTrustedOrigins),
                ...findUntrustedLinks(override.routes, parsedTrustedOrigins),
            ]),
        ];
    }
}
