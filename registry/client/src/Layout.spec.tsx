import { render, screen } from '@testing-library/react';
import { AdminContext, defaultI18nProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Layout } from './Layout';
import { stubApi } from './testUtils';

describe('Layout', () => {
    it('puts a page between the app bar and the menu', async () => {
        // The layout also checks now and then whether a new version of the UI is deployed
        stubApi({ '/': '<html></html>' });

        render(
            <AdminContext i18nProvider={defaultI18nProvider}>
                <Layout>
                    <p>Apps</p>
                </Layout>
            </AdminContext>,
        );

        expect(await screen.findByText('Apps')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });
});
