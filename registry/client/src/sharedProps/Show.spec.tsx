import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { sharedProps } from './index';

describe('SharedPropsShow', () => {
    it('shows a props set', async () => {
        stubApi({
            '/api/v1/shared_props/shared': {
                name: 'shared',
                props: { apiUrl: 'https://api.example.com' },
                ssrProps: { internalApiUrl: 'http://api.internal' },
            },
        });
        renderResource('shared_props', sharedProps, '/shared_props/shared/show');

        expect(await screen.findByText('Props set "shared"')).toBeInTheDocument();
        expect(screen.getByText('apiUrl')).toBeInTheDocument();
        expect(screen.getByText('internalApiUrl')).toBeInTheDocument();
    });
});
