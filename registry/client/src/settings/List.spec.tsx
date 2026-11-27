import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { filterOf, renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { settings } from './index';

function stubSettings() {
    return stubApi({
        '/api/v1/settings': [
            { key: 'baseUrl', value: 'https://example.com', scope: 'ilc', secret: false, meta: { type: 'url' } },
            { key: 'auth.openid.enabled', value: true, scope: 'registry', secret: false, meta: { type: 'boolean' } },
            { key: 'auth.openid.clientSecret', value: 'hidden', scope: 'registry', secret: true },
            { key: 'cdn.password', value: 'hidden', scope: 'ilc', secret: false, meta: { type: 'password' } },
            { key: 'i18n.supported.locale', value: ['en-US', 'ua-UA'], scope: 'ilc', meta: { type: 'string[]' } },
            { key: 'i18n.fallback.locale', scope: 'ilc', meta: { type: 'string[]' } },
            { key: 'cspConfig', value: { defaultSrc: ['self'] }, scope: 'ilc', meta: { type: 'json' } },
            { key: 'legacy', value: 'no meta', scope: 'ilc' },
            { key: 'trailingSlash', value: 'doNothing', scope: 'ilc', meta: { type: 'enum' }, protected: true },
        ],
        '/api/v1/router_domains': [{ id: 1, domainName: 'example.com' }],
    });
}

async function findRow(key: string) {
    return within((await screen.findByText(key)).closest('tr')!);
}

describe('SettingList', () => {
    it('lists the settings with their values', async () => {
        stubSettings();
        renderResource('settings', settings, '/settings');

        expect((await findRow('baseUrl')).getByText('https://example.com')).toBeInTheDocument();
        expect((await findRow('auth.openid.enabled')).getByTestId('true')).toBeInTheDocument();
        expect((await findRow('i18n.supported.locale')).getByText('en-US, ua-UA')).toBeInTheDocument();
        expect((await findRow('cspConfig')).getByText('{"defaultSrc":["self"]}')).toBeInTheDocument();
        expect((await findRow('trailingSlash')).getByText('doNothing')).toBeInTheDocument();
    });

    it('does not show secrets and passwords', async () => {
        stubSettings();
        renderResource('settings', settings, '/settings');

        expect((await findRow('auth.openid.clientSecret')).getByText('********')).toBeInTheDocument();
        expect((await findRow('cdn.password')).getByText('********')).toBeInTheDocument();
        expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    });

    it('shows no value for a setting it does not know the type of, or that has none', async () => {
        stubSettings();
        renderResource('settings', settings, '/settings');

        await findRow('legacy');
        expect(screen.queryByText('no meta')).not.toBeInTheDocument();
        expect((await findRow('i18n.fallback.locale')).queryByText(/,/)).not.toBeInTheDocument();
    });

    it('lets a setting be edited, unless it is protected', async () => {
        stubSettings();
        renderResource('settings', settings, '/settings');

        expect(await (await findRow('baseUrl')).findByRole('link', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/settings/baseUrl',
        );
        expect((await (await findRow('trailingSlash')).findByText('Edit')).closest('a')).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    it('lists the settings of a router domain', async () => {
        const requests = stubSettings();
        renderResource('settings', settings, '/settings');

        await userEvent.click(await screen.findByRole('combobox', { name: 'Enforce domain' }));
        await userEvent.click(await screen.findByRole('option', { name: 'example.com' }));

        await waitFor(() => expect(requests.map(filterOf)).toContainEqual({ enforceDomain: 1 }));
    });

    it('lists keys and values on a small screen', async () => {
        stubSmallScreen();
        stubSettings();
        renderResource('settings', settings, '/settings');

        expect(await screen.findByText('baseUrl')).toBeInTheDocument();
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        // A value that is not text is shown as JSON, and a secret is not shown at all
        expect(screen.getByText('{"defaultSrc":["self"]}')).toBeInTheDocument();
        expect(screen.getByText('["en-US","ua-UA"]')).toBeInTheDocument();
        expect(screen.getAllByText('********')).toHaveLength(2);
        expect(screen.queryByText('hidden')).not.toBeInTheDocument();
        expect(screen.queryByText('null')).not.toBeInTheDocument();
    });
});
