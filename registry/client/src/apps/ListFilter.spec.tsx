import { describe, expect, it } from 'vitest';

import { getListFilters } from './ListFilter';

describe('apps list filters', () => {
    it('filters by name and kind', () => {
        expect(getListFilters([])).toMatchObject([{ props: { source: 'q' } }, { props: { source: 'kind' } }]);
    });

    it('also filters by domain once there are router domains', () => {
        const routerDomains = [
            { id: 'null', domainName: 'Non-specified' },
            { id: 1, domainName: 'example.com' },
        ];

        expect(getListFilters(routerDomains)).toMatchObject([
            { props: { source: 'q' } },
            { props: { source: 'kind' } },
            { props: { source: 'domainId', choices: routerDomains, optionText: 'domainName' } },
        ]);
    });
});
