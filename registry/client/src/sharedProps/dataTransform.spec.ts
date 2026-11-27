import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

describe('shared props data transform', () => {
    it('takes the name as the id', () => {
        expect(transformGet({ name: 'main', props: { apiUrl: 'https://api.example.com' } })).toEqual({
            id: 'main',
            name: 'main',
            props: { apiUrl: 'https://api.example.com' },
        });
    });

    it('creates a record with its name', () => {
        expect(transformSet({ name: 'main', props: { apiUrl: 'https://api.example.com' } })).toEqual({
            name: 'main',
            props: { apiUrl: 'https://api.example.com' },
        });
    });

    it('updates a record without its name, which cannot be changed', () => {
        expect(
            transformSet({ id: 'main', name: 'main', props: { apiUrl: 'https://api.example.com' } }, 'update'),
        ).toEqual({ props: { apiUrl: 'https://api.example.com' } });
    });
});
