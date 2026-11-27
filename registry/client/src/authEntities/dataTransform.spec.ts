import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

const root = { id: 1, identifier: 'root', provider: 'local', role: 'admin' };

describe('auth entities data transform', () => {
    it('reads an auth entity as it is', () => {
        expect(transformGet(root)).toEqual(root);
    });

    it('creates an auth entity with every value of the form', () => {
        const created = { identifier: 'ci', provider: 'bearer', role: 'readonly', secret: 'token' };

        expect(transformSet(created)).toEqual(created);
    });

    it('updates only the role and the secret, the rest identifies the entity', () => {
        expect(transformSet({ ...root, secret: 'pwd' }, 'update')).toEqual({ role: 'admin', secret: 'pwd' });
    });
});
