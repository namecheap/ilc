import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { settings } from './index';

describe('SettingEdit', () => {
    it('changes the value of a setting', async () => {
        const requests = stubApi({
            '/api/v1/settings/baseUrl': { key: 'baseUrl', value: 'https://example.com', meta: { type: 'url' } },
        });
        renderResource('settings', settings, '/settings/baseUrl');

        expect(await screen.findByText('Setting "baseUrl"')).toBeInTheDocument();
        const value = await screen.findByRole('textbox', { name: 'Value' });
        await userEvent.clear(value);
        await userEvent.type(value, 'https://example.org');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toEqual({
            method: 'PUT',
            path: '/api/v1/settings/baseUrl',
            query: expect.anything(),
            body: { key: 'baseUrl', value: 'https://example.org', domainId: null },
        });
    });

    it('changes a setting of a router domain', async () => {
        const requests = stubApi({
            '/api/v1/settings/baseUrl': {
                key: 'baseUrl',
                value: 'https://example.com',
                domainId: 3,
                meta: { type: 'url' },
            },
        });
        renderResource('settings', settings, '/settings/baseUrl%403');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Value' }), '/shop');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(requests[0].query.get('domainId')).toBe('3');
        expect(writes(requests)[0]).toMatchObject({
            path: '/api/v1/settings/baseUrl',
            body: { key: 'baseUrl', value: 'https://example.com/shop', domainId: 3 },
        });
    });

    it('offers only to save, a setting cannot be deleted', async () => {
        stubApi({
            '/api/v1/settings/baseUrl': { key: 'baseUrl', value: 'https://example.com', meta: { type: 'url' } },
        });
        renderResource('settings', settings, '/settings/baseUrl');

        expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('has no input for a setting it does not know the type of', async () => {
        stubApi({ '/api/v1/settings/legacy': { key: 'legacy', value: 'x' } });
        renderResource('settings', settings, '/settings/legacy');

        expect(await screen.findByText('Setting "legacy"')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
});
