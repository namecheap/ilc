import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

describe('routes dataTransform', () => {
    it('makes an API record editable: slots are a list', () => {
        const record = transformGet({
            id: 7,
            route: '/news/*',
            meta: { protected: true },
            slots: {
                body: { appName: '@portal/news', kind: 'primary', props: { page: 1 } },
                navbar: { appName: '@portal/navbar' },
            },
        });

        expect(record).toEqual({
            id: 7,
            route: '/news/*',
            meta: { protected: true },
            slots: [
                { key: 'body', appName: '@portal/news', kind: 'primary', props: { page: 1 } },
                { key: 'navbar', appName: '@portal/navbar', kind: null },
            ],
        });
    });

    it('turns form values back into the API shape', () => {
        const data = transformSet({
            id: 7,
            route: '/news/*',
            meta: { protected: true },
            slots: [
                { key: 'body', appName: '@portal/news', kind: 'primary', props: { page: 1 } },
                { key: 'navbar', appName: '@portal/navbar', kind: null },
            ],
        });

        expect(data).toEqual({
            route: '/news/*',
            meta: { protected: true },
            slots: {
                body: { appName: '@portal/news', kind: 'primary', props: { page: 1 } },
                navbar: { appName: '@portal/navbar', kind: null },
            },
        });
    });

    it('omits empty metadata', () => {
        expect(transformSet({ route: '/', meta: null })).toEqual({ route: '/' });
    });
});
