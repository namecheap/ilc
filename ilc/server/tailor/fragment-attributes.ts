import type { CacheableFragmentAttributes } from './fragment-render';

export interface FragmentWrapperConf {
    appId: string;
    name?: string;
    src: string;
    props?: Record<string, unknown>;
    timeout?: number;
    ignoreInvalidSsl?: boolean;
    cache?: {
        enabled?: boolean;
        ttlSeconds?: number;
    };
}

/**
 * Tailor's parsed `<fragment>` attributes merged with ServerRouter#getFragmentsContext; carries
 * more fields than listed. No index signature: one would break assignability to RequestFragment's
 * attributes param, which requires this stay a supertype of the index-signature-less CacheableFragmentAttributes.
 */
export interface FragmentAttributes extends CacheableFragmentAttributes {
    public?: boolean | string;
    async?: boolean;
    ignoreInvalidSsl?: boolean;
    spaBundleUrl?: string;
    wrapperPropsOverride?: Record<string, unknown>;
}
