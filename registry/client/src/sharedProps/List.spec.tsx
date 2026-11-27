import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { sharedProps } from './index';

describe('SharedPropsList', () => {
    it('lists the props sets', async () => {
        stubApi({ '/api/v1/shared_props': [{ name: 'shared' }] });
        renderResource('shared_props', sharedProps, '/shared_props');

        const row = (await screen.findByText('shared')).closest('tr')!;
        expect(await within(row).findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/shared_props/shared');
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/shared_props/create');
    });

    it('lists the names on a small screen', async () => {
        stubSmallScreen();
        stubApi({ '/api/v1/shared_props': [{ name: 'shared' }] });
        renderResource('shared_props', sharedProps, '/shared_props');

        expect(await screen.findByText('shared')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
