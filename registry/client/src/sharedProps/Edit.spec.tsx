import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { sharedProps } from './index';

const shared = { name: 'shared', props: { apiUrl: 'https://api.example.com' } };

async function save() {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('SharedPropsEdit', () => {
    it('shows the name of a props set, which cannot be changed', async () => {
        stubApi({ '/api/v1/shared_props/shared': shared });
        const { container } = renderResource('shared_props', sharedProps, '/shared_props/shared');

        expect(await screen.findByText('Props set "shared"')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
        // One code editor for the props and one for the SSR props
        expect(container.querySelectorAll('.ace_editor')).toHaveLength(2);
    });
});

describe('SharedPropsCreate', () => {
    it('creates a props set, empty unless props are entered', async () => {
        const requests = stubApi({ '/api/v1/shared_props/shared': shared });
        renderResource('shared_props', sharedProps, '/shared_props/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'shared');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'POST',
            path: '/api/v1/shared_props',
            body: { name: 'shared', props: {} },
        });
    });
});
