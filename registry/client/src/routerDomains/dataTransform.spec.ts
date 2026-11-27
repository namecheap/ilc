import { describe, expect, it } from 'vitest';

import { transformGet, transformSet } from './dataTransform';

const domain = { id: 3, domainName: 'example.com', template500: '500' };

describe('router domains data transform', () => {
    it('reads a router domain as it is', () => {
        expect(transformGet(domain)).toEqual(domain);
    });

    it('creates a router domain with every value of the form', () => {
        expect(transformSet({ domainName: 'example.com', template500: '500' })).toEqual({
            domainName: 'example.com',
            template500: '500',
        });
    });

    it('updates a router domain without its id, which is in the URL', () => {
        expect(transformSet(domain, 'update')).toEqual({ domainName: 'example.com', template500: '500' });
    });
});
