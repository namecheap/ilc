import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { filterOf, renderResource, stubApi, writes } from '../testUtils';

import { settings } from './index';

function stubSettings() {
    return stubApi({
        '/api/v1/settings': [
            { key: 'baseUrl', value: 'https://example.com', meta: { type: 'url' } },
            { key: 'trailingSlash', value: 'doNothing', meta: { type: 'string' }, protected: true },
        ],
        '/api/v1/router_domains': [{ id: 1, domainName: 'example.com' }],
    });
}

async function choose(select: RegExp, option: string) {
    await userEvent.click(await screen.findByRole('combobox', { name: select }));
    await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('SettingCreate', () => {
    it('overrides a setting for a router domain and goes to the settings of that domain', async () => {
        const requests = stubSettings();
        const locations: string[] = [];
        renderResource('settings', settings, '/settings/create', {
            onLocation: (location) => locations.push(location.pathname + location.search),
        });

        await choose(/Domain/, 'example.com');
        await choose(/Key/, 'baseUrl');
        // The input of the value comes with the setting, by its type
        await userEvent.type(await screen.findByRole('textbox', { name: 'Value' }), 'https://example.org');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toEqual({
            method: 'POST',
            path: '/api/v1/settings',
            query: expect.anything(),
            body: { key: 'baseUrl', value: 'https://example.org', domainId: 1 },
        });
        await waitFor(() => expect(locations.at(-1)).toMatch(/^\/settings\?filter=/));
        expect(JSON.parse(new URLSearchParams(locations.at(-1)?.split('?')[1]).get('filter') ?? '')).toEqual({
            enforceDomain: 1,
        });
    });

    it('offers only the settings that can be overridden for a domain', async () => {
        const requests = stubSettings();
        renderResource('settings', settings, '/settings/create');

        await screen.findByRole('combobox', { name: /Key/ });

        await waitFor(() => expect(requests.filter((request) => request.path === '/api/v1/settings')).not.toEqual([]));
        for (const request of requests.filter((request) => request.path === '/api/v1/settings')) {
            expect(filterOf(request)).toEqual({ allowedForDomains: true });
        }
    });

    it('has no input for a value until a setting is chosen', async () => {
        stubSettings();
        renderResource('settings', settings, '/settings/create');

        await screen.findByRole('combobox', { name: /Key/ });
        expect(screen.queryByRole('textbox', { name: 'Value' })).not.toBeInTheDocument();
    });

    it('does not override a protected setting', async () => {
        const requests = stubSettings();
        renderResource('settings', settings, '/settings/create');

        await choose(/Key/, 'trailingSlash');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(
            await screen.findByText("The 'trailingSlash' setting cannot be modified through UI"),
        ).toBeInTheDocument();
        expect(writes(requests)).toHaveLength(0);
    });
});
