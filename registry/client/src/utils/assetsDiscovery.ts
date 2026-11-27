import type { RaRecord } from 'react-admin';

import * as validators from '../validators';

/**
 * Apps and shared libraries either name their bundles or give an assets discovery URL,
 * from which the Registry reads the bundles itself.
 */
export function hasAssetsDiscoveryUrl(values: Partial<RaRecord>) {
    return !!values.assetsDiscoveryUrl && values.assetsDiscoveryUrl.length !== 0;
}

/**
 * Helper text of the assets discovery URL input. `provided` names the fields the URL makes unnecessary.
 */
export function getAssetsDiscoveryHint(values: Partial<RaRecord>, provided: string) {
    if (!hasAssetsDiscoveryUrl(values)) {
        return '';
    }

    return `Do not need to specify ${provided} because they would be fetched and set from assets discovery URL if they exist there`;
}

/**
 * The SPA bundle is required unless the assets discovery URL is set, which provides it
 */
export function validateSpaBundle(value: unknown, values: Partial<RaRecord>) {
    if (hasAssetsDiscoveryUrl(values)) {
        return undefined;
    }

    return value ? validators.url(value) : validators.required(value, values);
}
