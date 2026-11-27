import { describe, expect, it } from 'vitest';

import { getListFilters } from './ListFilter';

describe('templates list filters', () => {
    it('has no filters when ILC serves a single domain', () => {
        expect(getListFilters([])).toEqual([]);
    });

    it('filters by domain once there are router domains', () => {
        const routerDomains = [
            { id: 'null', domainName: 'Non-specified' },
            { id: 1, domainName: 'example.com' },
        ];

        expect(getListFilters(routerDomains)).toMatchObject([
            { props: { source: 'domainId', choices: routerDomains, optionText: 'domainName' } },
        ]);
    });
});
