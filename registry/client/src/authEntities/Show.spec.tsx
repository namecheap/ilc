import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { authEntities } from './index';

describe('AuthEntityShow', () => {
    it('shows an auth entity, whose secret the API never returns', async () => {
        stubApi({ '/api/v1/auth_entities/1': { id: 1, identifier: 'root', provider: 'local', role: 'admin' } });
        renderResource('auth_entities', authEntities, '/auth_entities/1/show');

        expect(await screen.findByText('Auth Entity "root"')).toBeInTheDocument();
        expect(screen.getByText('root')).toBeInTheDocument();
        expect(screen.getByText('local')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('<NULL>')).toBeInTheDocument();
    });
});
