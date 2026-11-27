import { describe, expect, it } from 'vitest';

import { listFilters } from './ListFilter';

describe('shared libraries list filters', () => {
    it('filters by name', () => {
        expect(listFilters).toMatchObject([{ props: { source: 'name', alwaysOn: true } }]);
    });
});
