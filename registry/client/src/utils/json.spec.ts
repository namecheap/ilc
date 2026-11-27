import { describe, expect, it } from 'vitest';

import { parseJSON } from './json';

describe('json utils', () => {
    describe('parseJSON', () => {
        it('parses the JSON strings nested in objects and arrays', () => {
            const snapshot = {
                name: '@portal/navbar',
                props: '{"apiUrl":"https://api.example.com"}',
                configSelector: '["shared"]',
                slots: [{ props: '{"a":1}' }],
            };

            expect(parseJSON(snapshot)).toEqual({
                name: '@portal/navbar',
                props: { apiUrl: 'https://api.example.com' },
                configSelector: ['shared'],
                slots: [{ props: { a: 1 } }],
            });
        });

        it('keeps a blank string', () => {
            expect(parseJSON({ adminNotes: '', namespace: '  ' })).toEqual({ adminNotes: '', namespace: '  ' });
        });

        it('keeps the values that are not JSON', () => {
            expect(parseJSON({ route: '/news/*', next: false, orderPos: 10, domainId: null })).toEqual({
                route: '/news/*',
                next: false,
                orderPos: 10,
                domainId: null,
            });
        });
    });
});
