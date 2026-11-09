import { z } from 'zod';

/** The `overrideConfigSigning` config section. Environment variables arrive as strings, so numbers are coerced. */
export const overrideConfigSigningConfigSchema = z.object({
    ttlSeconds: z.coerce.number().int().positive(),
    activeKeyId: z.string().min(1).nullable(),
    /** Key id to Ed25519 private key in PEM */
    privateKeys: z.record(z.string().min(1), z.string().min(1)).nullable(),
    rateLimitPerMinute: z.coerce.number().int().positive(),
});

export type OverrideConfigSigningConfig = z.output<typeof overrideConfigSigningConfigSchema>;

export const signOverrideConfigBodySchema = z.strictObject({
    value: z
        .string()
        .min(1)
        .max(8 * 1024),
});

export type SignOverrideConfigBody = z.output<typeof signOverrideConfigBodySchema>;

/** Served to ILC as the `overrideConfigSigningPublicKeys` setting */
export interface OverrideConfigSigningPublicKey {
    kid: string;
    /** SPKI PEM */
    publicKey: string;
}

export interface OverrideConfigSignature {
    /** Detached compact JWS: `BASE64URL(header)..BASE64URL(signature)` */
    signature: string;
    /** ISO date */
    expiresAt: string;
    /** Distinct links to hosts outside `overrideConfigTrustedOrigins`, signed but removed by ILC; empty when all are trusted */
    untrustedLinks: string[];
}
