import { describe, expect, it } from 'vitest';

import { parseSettingId, transformGet, transformSet } from './dataTransform';

describe('settings dataTransform', () => {
    it('uses the key as the id and fills the fields the API omits', () => {
        expect(transformGet({ key: 'baseUrl', meta: { type: 'url' } })).toEqual({
            id: 'baseUrl',
            key: 'baseUrl',
            meta: { type: 'url' },
            value: null,
            default: null,
            domainId: null,
        });
    });

    it('gives an override for a router domain an id of its own', () => {
        const record = transformGet({ key: 'baseUrl', value: 'https://example.com', domainId: 3 });

        expect(record.id).toBe('baseUrl@3');
        expect(parseSettingId('baseUrl@3')).toEqual({ key: 'baseUrl', domainId: '3' });
        expect(parseSettingId('auth.openid.clientId')).toEqual({ key: 'auth.openid.clientId' });
    });

    it('turns the choices of an enum into select choices', () => {
        const record = transformGet({
            key: 'trailingSlash',
            value: 'doNothing',
            meta: { type: 'enum', choices: ['doNothing', 'redirectToBaseUrl'] },
        });

        expect(record.meta.choices).toEqual([
            { id: 'doNothing', name: 'doNothing' },
            { id: 'redirectToBaseUrl', name: 'redirectToBaseUrl' },
        ]);
    });

    it('sends only the key, the value and the domain', () => {
        const data = transformSet({ id: 'baseUrl', key: 'baseUrl', value: null, domainId: 3, scope: 'ilc', meta: {} });

        expect(data).toEqual({ key: 'baseUrl', value: '', domainId: 3 });
    });

    it('refuses to save a protected setting', () => {
        expect(() => transformSet({ key: 'baseUrl', value: 'x', protected: true })).toThrow(
            "The 'baseUrl' setting cannot be modified through UI",
        );
    });
});
