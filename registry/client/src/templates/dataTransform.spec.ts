import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

describe('templates data transform', () => {
    it('takes the name as the id', () => {
        expect(transformGet({ name: 'main', content: '<html></html>' })).toEqual({
            id: 'main',
            name: 'main',
            content: '<html></html>',
        });
    });

    it('creates a record with its name', () => {
        expect(transformSet({ name: 'main', content: '<html></html>' })).toEqual({
            name: 'main',
            content: '<html></html>',
        });
    });

    it('updates a record without its name, which cannot be changed', () => {
        expect(transformSet({ id: 'main', name: 'main', content: '<html></html>' }, 'update')).toEqual({
            content: '<html></html>',
        });
    });
});
