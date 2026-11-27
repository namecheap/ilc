import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { authEntities } from './index';

function stubAuthEntities() {
    return stubApi({
        '/api/v1/auth_entities': [
            { id: 1, identifier: 'root', provider: 'local', role: 'admin' },
            { id: 2, identifier: 'ci', provider: 'bearer', role: 'readonly' },
        ],
    });
}

describe('AuthEntityList', () => {
    it('lists who may sign in, how and with which role', async () => {
        stubAuthEntities();
        renderResource('auth_entities', authEntities, '/auth_entities');

        const row = (await screen.findByText('ci')).closest('tr')!;
        expect(within(row).getByText('bearer')).toBeInTheDocument();
        expect(within(row).getByText('readonly')).toBeInTheDocument();
        expect(await within(row).findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/auth_entities/2');
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/auth_entities/create');
    });

    it('lists identifiers and providers on a small screen', async () => {
        stubSmallScreen();
        stubAuthEntities();
        renderResource('auth_entities', authEntities, '/auth_entities');

        expect(await screen.findByText('ci')).toBeInTheDocument();
        expect(screen.getByText('bearer')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
