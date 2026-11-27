import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { filterOf, renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { templates } from './index';

function stubTemplates(routerDomains: object[] = []) {
    return stubApi({
        '/api/v1/template': [{ name: 'master' }, { name: '500' }],
        '/api/v1/router_domains': routerDomains,
    });
}

describe('TemplateList', () => {
    it('lists the templates', async () => {
        stubTemplates();
        renderResource('template', templates, '/template');

        const row = (await screen.findByText('master')).closest('tr')!;
        expect(await within(row).findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/template/master');
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/template/create');
        expect(screen.queryByRole('combobox', { name: 'Domain' })).not.toBeInTheDocument();
    });

    it('filters by the domain whose routes use a template', async () => {
        const requests = stubTemplates([{ id: 1, domainName: 'example.com' }]);
        renderResource('template', templates, '/template');

        await userEvent.click(await screen.findByRole('combobox', { name: 'Domain' }));
        await userEvent.click(screen.getByRole('option', { name: 'example.com' }));

        await waitFor(() => expect(requests.map(filterOf)).toContainEqual({ domainId: 1 }));
    });

    it('lists the names on a small screen', async () => {
        stubSmallScreen();
        stubTemplates();
        renderResource('template', templates, '/template');

        expect(await screen.findByText('master')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
