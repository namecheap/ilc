import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { authEntities } from './index';

const root = { id: 1, identifier: 'root', provider: 'local', role: 'admin' };

async function save() {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('AuthEntityEdit', () => {
    it('changes the role and the secret only', async () => {
        const requests = stubApi({ '/api/v1/auth_entities/1': root });
        renderResource('auth_entities', authEntities, '/auth_entities/1');

        expect(await screen.findByText('Auth Entity "root"')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Identifier' })).not.toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('combobox', { name: /Role/ }));
        await userEvent.click(screen.getByRole('option', { name: 'Readonly' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Secret' }), 'new-secret');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'PUT',
            path: '/api/v1/auth_entities/1',
            body: { role: 'readonly', secret: 'new-secret' },
        });
    });
});

describe('AuthEntityCreate', () => {
    it('creates an auth entity', async () => {
        const requests = stubApi({
            'POST /api/v1/auth_entities': { id: 3, identifier: 'ci', provider: 'bearer', role: 'readonly' },
            '/api/v1/auth_entities/3': { id: 3, identifier: 'ci', provider: 'bearer', role: 'readonly' },
        });
        renderResource('auth_entities', authEntities, '/auth_entities/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Identifier' }), 'ci');
        await userEvent.click(screen.getByRole('combobox', { name: /Provider/ }));
        await userEvent.click(screen.getByRole('option', { name: 'Bearer' }));
        await userEvent.click(screen.getByRole('combobox', { name: /Role/ }));
        await userEvent.click(screen.getByRole('option', { name: 'Readonly' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Secret' }), 'token');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'POST',
            path: '/api/v1/auth_entities',
            body: { identifier: 'ci', provider: 'bearer', role: 'readonly', secret: 'token' },
        });
    });

    it('does not create an auth entity without an identifier, a provider and a role', async () => {
        const requests = stubApi({});
        renderResource('auth_entities', authEntities, '/auth_entities/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Secret' }), 'token');
        await save();

        expect(await screen.findAllByText('Required')).toHaveLength(3);
        expect(writes(requests)).toHaveLength(0);
    });
});
