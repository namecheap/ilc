import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

describe('shared libraries data transform', () => {
    it('takes the name as the id', () => {
        expect(transformGet({ name: 'forms', spaBundle: 'https://cdn.example.com/forms.js' })).toEqual({
            id: 'forms',
            name: 'forms',
            spaBundle: 'https://cdn.example.com/forms.js',
        });
    });

    it('creates a shared library with its name', () => {
        expect(transformSet({ name: 'forms', spaBundle: 'https://cdn.example.com/forms.js' })).toEqual({
            name: 'forms',
            spaBundle: 'https://cdn.example.com/forms.js',
        });
    });

    it('updates a shared library without its name, which cannot be changed', () => {
        const sharedLib = { id: 'forms', name: 'forms', adminNotes: 'Owned by the forms team' };

        expect(transformSet(sharedLib, 'update')).toEqual({ adminNotes: 'Owned by the forms team' });
    });

    it('leaves the bundle to the assets discovery when its URL is set', () => {
        const sharedLib = {
            name: 'forms',
            assetsDiscoveryUrl: 'https://cdn.example.com/forms/assets.json',
            spaBundle: 'https://cdn.example.com/forms.js',
            assetsDiscoveryUpdatedAt: 1700000000,
        };

        expect(transformSet(sharedLib)).toEqual({
            name: 'forms',
            assetsDiscoveryUrl: 'https://cdn.example.com/forms/assets.json',
        });
    });
});
