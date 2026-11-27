import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

describe('apps dataTransform', () => {
    it('makes an API record editable: the name is the id, dependencies are a list', () => {
        const record = transformGet({
            name: '@portal/navbar',
            kind: 'essential',
            props: { apiUrl: 'https://api.example.com' },
            dependencies: { react: 'https://cdn.example.com/react.js' },
        });

        expect(record).toEqual({
            id: '@portal/navbar',
            name: '@portal/navbar',
            kind: 'essential',
            props: { apiUrl: 'https://api.example.com' },
            dependencies: [{ key: 'react', value: 'https://cdn.example.com/react.js' }],
        });
    });

    it('turns form values back into the API shape', () => {
        const data = transformSet({
            id: '@portal/navbar',
            name: '@portal/navbar',
            props: { apiUrl: 'https://api.example.com' },
            dependencies: [{ key: 'react', value: 'https://cdn.example.com/react.js' }],
            assetsDiscoveryUpdatedAt: 1700000000,
            spaBundle: 'https://cdn.example.com/navbar.js',
        });

        expect(data).toEqual({
            name: '@portal/navbar',
            props: { apiUrl: 'https://api.example.com' },
            dependencies: { react: 'https://cdn.example.com/react.js' },
            spaBundle: 'https://cdn.example.com/navbar.js',
        });
    });

    it('does not send the name with an update, it cannot be changed', () => {
        expect(transformSet({ id: 'app', name: 'app', kind: 'primary' }, 'update')).toEqual({ kind: 'primary' });
    });

    it('leaves the SPA bundle to assets discovery when its URL is set', () => {
        const data = transformSet({
            name: '@portal/navbar',
            assetsDiscoveryUrl: 'https://cdn.example.com/assets-discovery.json',
            spaBundle: 'https://cdn.example.com/navbar.js',
        });

        expect(data).not.toHaveProperty('spaBundle');
    });

    it('sends SSR without values when its inputs are left empty', () => {
        expect(transformSet({ name: 'app', ssr: { src: undefined, timeout: null } }).ssr).toEqual({});
        expect(transformSet({ name: 'app', ssr: { src: 'http://app.example.com/ssr', timeout: 1500 } }).ssr).toEqual({
            src: 'http://app.example.com/ssr',
            timeout: 1500,
        });
    });

    it('does not change the values it gets', () => {
        const values = { id: 'app', name: 'app', dependencies: [] };

        transformSet(values, 'update');

        expect(values).toEqual({ id: 'app', name: 'app', dependencies: [] });
    });
});
