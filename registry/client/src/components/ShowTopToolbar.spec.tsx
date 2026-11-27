import { render, screen } from '@testing-library/react';
import { AdminContext, RecordContextProvider, ResourceContextProvider, defaultI18nProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { ShowTopToolbar } from './ShowTopToolbar';

describe('ShowTopToolbar', () => {
    it('offers to edit the record', async () => {
        render(
            <AdminContext i18nProvider={defaultI18nProvider}>
                <ResourceContextProvider value="template">
                    <RecordContextProvider value={{ id: 'master' }}>
                        <ShowTopToolbar />
                    </RecordContextProvider>
                </ResourceContextProvider>
            </AdminContext>,
        );

        expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '#/template/master');
    });
});
