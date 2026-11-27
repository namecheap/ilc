import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { filterOf, renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { sharedLibs } from './index';

function stubSharedLibs() {
    return stubApi({ '/api/v1/shared_libs': [{ name: 'forms', spaBundle: 'https://cdn.example.com/forms.js' }] });
}

describe('SharedLibList', () => {
    it('lists the shared libraries by the name apps import them by', async () => {
        stubSharedLibs();
        renderResource('shared_libs', sharedLibs, '/shared_libs');

        const row = (await screen.findByText('@sharedLibrary/forms')).closest('tr')!;
        expect(within(row).getByText('https://cdn.example.com/forms.js')).toBeInTheDocument();
        expect(await within(row).findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/shared_libs/forms');
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/shared_libs/create');
    });

    it('filters by name', async () => {
        const requests = stubSharedLibs();
        renderResource('shared_libs', sharedLibs, '/shared_libs');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'form');

        await waitFor(() => expect(requests.map(filterOf)).toContainEqual({ name: 'form' }));
    });

    it('lists names and bundles on a small screen', async () => {
        stubSmallScreen();
        stubSharedLibs();
        renderResource('shared_libs', sharedLibs, '/shared_libs');

        expect(await screen.findByText('@sharedLibrary/forms')).toBeInTheDocument();
        expect(screen.getByText('https://cdn.example.com/forms.js')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
