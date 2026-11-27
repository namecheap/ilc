import { QueryClient } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminContext } from 'react-admin';
import { describe, expect, it, vi } from 'vitest';

import { dataProvider } from '../../dataProvider';
import { apiError, stubApi } from '../../testUtils';

import { AddLocale } from './AddLocale';

const supportedLocales = { key: 'i18n.supported.locale', value: ['en-US', 'ua-UA', 'es-MX'] };
const defaultLocale = { key: 'i18n.default.locale', value: 'en-US' };

function renderDialog(currentLocales: string[] = []) {
    const onLocaleAdded = vi.fn();
    const onCancel = vi.fn();

    render(
        <AdminContext
            dataProvider={dataProvider}
            // A failed load is not tried again, which takes seconds
            queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
            <AddLocale open currentLocales={currentLocales} onLocaleAdded={onLocaleAdded} onCancel={onCancel} />
        </AdminContext>,
    );

    return { onLocaleAdded, onCancel };
}

async function chooseLocale(locale: string) {
    await userEvent.click(await screen.findByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: locale }));
}

describe('AddLocale', () => {
    it('adds a locale that is supported, not the default one and not used yet', async () => {
        stubApi({
            '/api/v1/settings/i18n.supported.locale': supportedLocales,
            '/api/v1/settings/i18n.default.locale': defaultLocale,
        });
        const { onLocaleAdded } = renderDialog(['ua-UA']);

        await userEvent.click(await screen.findByRole('combobox'));
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['es-MX']);
        await userEvent.click(screen.getByRole('option', { name: 'es-MX' }));
        await userEvent.click(screen.getByRole('button', { name: 'Add Locale' }));

        expect(onLocaleAdded).toHaveBeenCalledWith('es-MX');
    });

    it('adds nothing until a locale is chosen', async () => {
        stubApi({
            '/api/v1/settings/i18n.supported.locale': supportedLocales,
            '/api/v1/settings/i18n.default.locale': defaultLocale,
        });
        const { onLocaleAdded } = renderDialog();

        await screen.findByRole('combobox');
        await userEvent.click(screen.getByRole('button', { name: 'Add Locale' }));
        expect(onLocaleAdded).not.toHaveBeenCalled();

        await chooseLocale('ua-UA');
        await userEvent.click(screen.getByRole('button', { name: 'Add Locale' }));
        expect(onLocaleAdded).toHaveBeenCalledTimes(1);
    });

    it('can be cancelled', async () => {
        stubApi({
            '/api/v1/settings/i18n.supported.locale': supportedLocales,
            '/api/v1/settings/i18n.default.locale': defaultLocale,
        });
        const { onCancel } = renderDialog();

        await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalled();
    });

    it('tells when every supported locale is used', async () => {
        stubApi({
            '/api/v1/settings/i18n.supported.locale': supportedLocales,
            '/api/v1/settings/i18n.default.locale': defaultLocale,
        });
        renderDialog(['ua-UA', 'es-MX']);

        expect(await screen.findByText(/^No languages left to add/)).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('tells when the supported locales cannot be loaded', async () => {
        stubApi({
            '/api/v1/settings/i18n.supported.locale': apiError(500, { message: 'Database is down' }),
            '/api/v1/settings/i18n.default.locale': defaultLocale,
        });
        renderDialog();

        expect(
            await screen.findByText('Unable to fetch supported language due to Database is down'),
        ).toBeInTheDocument();
    });

    it('tells when the supported locales are not a list', async () => {
        stubApi({
            '/api/v1/settings/i18n.supported.locale': { key: 'i18n.supported.locale', value: 'en-US' },
            '/api/v1/settings/i18n.default.locale': defaultLocale,
        });
        renderDialog();

        expect(
            await screen.findByText('Unable to fetch supported language due to Unexpected response from API'),
        ).toBeInTheDocument();
    });
});
