import { render, screen } from '@testing-library/react';
import Cookies from 'js-cookie';
import {
    AdminContext,
    RecordContextProvider,
    ResourceContextProvider,
    defaultI18nProvider,
    type RaRecord,
} from 'react-admin';
import { describe, expect, it } from 'vitest';

import { authProvider } from '../authProvider';
import { ProtectedEditButton } from './ProtectedEditButton';

function renderForUser(role: string, record: RaRecord) {
    Cookies.set('ilcUserInfo', JSON.stringify({ identifier: 'user', role }));

    return render(
        <AdminContext authProvider={authProvider} i18nProvider={defaultI18nProvider}>
            <ResourceContextProvider value="app">
                <RecordContextProvider value={record}>
                    <ProtectedEditButton />
                    <span>record</span>
                </RecordContextProvider>
            </ResourceContextProvider>
        </AdminContext>,
    );
}

describe('ProtectedEditButton', () => {
    it('links to the edit page of a record', async () => {
        renderForUser('admin', { id: '@portal/navbar' });

        const link = await screen.findByRole('link', { name: 'Edit' });
        expect(link).toHaveAttribute('href', '#/app/%40portal%2Fnavbar');
        expect(link).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('is disabled for a record the API marks as protected', async () => {
        renderForUser('admin', { id: '@portal/navbar', protected: true });

        // A disabled link is not exposed as a link, so it is found by its text
        const label = await screen.findByText('Edit');
        expect(label.closest('a')).toHaveAttribute('aria-disabled', 'true');
    });

    it('is not shown to a read-only user', async () => {
        renderForUser('readonly', { id: '@portal/navbar' });

        await screen.findByText('record');
        // The access check is asynchronous, the button never appears while or after it runs
        await expect.poll(() => screen.queryByText('Edit')).not.toBeInTheDocument();
    });
});
