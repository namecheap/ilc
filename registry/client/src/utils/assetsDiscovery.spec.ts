import { describe, expect, it } from 'vitest';

import { getAssetsDiscoveryHint, hasAssetsDiscoveryUrl, validateSpaBundle } from './assetsDiscovery';

const discovered = { assetsDiscoveryUrl: 'https://cdn.example.com/assets.json' };

describe('assets discovery', () => {
    describe('hasAssetsDiscoveryUrl', () => {
        it('tells whether the assets discovery URL is filled in', () => {
            expect(hasAssetsDiscoveryUrl(discovered)).toBe(true);
            expect(hasAssetsDiscoveryUrl({ assetsDiscoveryUrl: '' })).toBe(false);
            expect(hasAssetsDiscoveryUrl({ assetsDiscoveryUrl: null })).toBe(false);
            expect(hasAssetsDiscoveryUrl({})).toBe(false);
        });
    });

    describe('getAssetsDiscoveryHint', () => {
        it('names the fields the assets discovery provides', () => {
            expect(getAssetsDiscoveryHint(discovered, 'SPA bundle')).toBe(
                'Do not need to specify SPA bundle because they would be fetched and set from assets discovery URL if they exist there',
            );
        });

        it('is empty without the assets discovery URL', () => {
            expect(getAssetsDiscoveryHint({}, 'SPA bundle')).toBe('');
        });
    });

    describe('validateSpaBundle', () => {
        it('requires the bundle', () => {
            expect(validateSpaBundle('', {})).toBe('ra.validation.required');
        });

        it('takes only a URL for the bundle', () => {
            expect(validateSpaBundle('navbar.js', {})).toBe('Should be a valid URL');
            expect(validateSpaBundle('https://cdn.example.com/navbar.js', {})).toBeUndefined();
        });

        it('does not need the bundle when the assets discovery provides it', () => {
            expect(validateSpaBundle('', discovered)).toBeUndefined();
        });
    });
});
