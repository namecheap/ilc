import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { sharedLibs } from './index';

const forms = { name: 'forms', spaBundle: 'https://cdn.example.com/forms.js' };

async function save() {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('SharedLibEdit', () => {
    it('updates a shared library, whose name cannot be changed', async () => {
        const requests = stubApi({ '/api/v1/shared_libs/forms': forms });
        renderResource('shared_libs', sharedLibs, '/shared_libs/forms');

        expect(await screen.findByText('@sharedLibrary/forms')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
        await userEvent.type(screen.getByRole('textbox', { name: /^Admin notes/ }), 'Owned by the forms team');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toEqual({
            method: 'PUT',
            path: '/api/v1/shared_libs/forms',
            query: expect.anything(),
            body: { spaBundle: 'https://cdn.example.com/forms.js', adminNotes: 'Owned by the forms team' },
        });
    });

    it('needs no SPA bundle when the assets discovery provides it', async () => {
        const requests = stubApi({ '/api/v1/shared_libs/forms': forms });
        renderResource('shared_libs', sharedLibs, '/shared_libs/forms');

        await userEvent.click(await screen.findByRole('tab', { name: 'Assets' }));
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Assets discovery url' }),
            'https://cdn.example.com/forms/assets.json',
        );
        expect(screen.getByRole('textbox', { name: /Spa bundle/ })).toBeDisabled();
        expect(screen.getByText(/^Do not need to specify SPA bundle because/)).toBeInTheDocument();
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0].body).toEqual({ assetsDiscoveryUrl: 'https://cdn.example.com/forms/assets.json' });
    });
});

describe('SharedLibCreate', () => {
    it('creates a shared library', async () => {
        const requests = stubApi({ '/api/v1/shared_libs/forms': forms });
        renderResource('shared_libs', sharedLibs, '/shared_libs/create');

        expect(await screen.findByText('@sharedLibrary/')).toBeInTheDocument();
        await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'forms');
        await userEvent.click(screen.getByRole('tab', { name: 'Assets' }));
        await userEvent.type(screen.getByRole('textbox', { name: /Spa bundle/ }), 'https://cdn.example.com/forms.js');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({ method: 'POST', path: '/api/v1/shared_libs', body: forms });
    });

    it('takes no name with a space', async () => {
        const requests = stubApi({});
        renderResource('shared_libs', sharedLibs, '/shared_libs/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'my forms');
        await save();

        expect(await screen.findByText('Whitespaces are disallowed')).toBeInTheDocument();
        expect(writes(requests)).toHaveLength(0);
    });

    it('does not create a shared library without a name and a bundle', async () => {
        const requests = stubApi({});
        renderResource('shared_libs', sharedLibs, '/shared_libs/create');

        await userEvent.type(await screen.findByRole('textbox', { name: /^Admin notes/ }), 'Owned by the forms team');
        await save();

        expect(await screen.findAllByText('Required')).toHaveLength(2);
        expect(writes(requests)).toHaveLength(0);
    });
});
