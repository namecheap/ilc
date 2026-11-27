import { render, screen } from '@testing-library/react';
import {
    AdminContext,
    ResourceContextProvider,
    ResourceDefinitionContextProvider,
    defaultI18nProvider,
} from 'react-admin';
import { describe, expect, it } from 'vitest';

import { ListTopToolbar } from './ListTopToolbar';

function renderToolbar(hasCreate: boolean) {
    return render(
        <AdminContext i18nProvider={defaultI18nProvider}>
            <ResourceDefinitionContextProvider definitions={{ template: { name: 'template', hasCreate } }}>
                <ResourceContextProvider value="template">
                    <ListTopToolbar />
                    <span>list</span>
                </ResourceContextProvider>
            </ResourceDefinitionContextProvider>
        </AdminContext>,
    );
}

describe('ListTopToolbar', () => {
    it('offers to create a record of a resource that has a create page', async () => {
        renderToolbar(true);

        expect(await screen.findByRole('link', { name: 'Create' })).toHaveAttribute('href', '#/template/create');
    });

    it('offers nothing for a resource without a create page', async () => {
        renderToolbar(false);

        await screen.findByText('list');
        await expect.poll(() => screen.queryByText('Create')).not.toBeInTheDocument();
    });
});
