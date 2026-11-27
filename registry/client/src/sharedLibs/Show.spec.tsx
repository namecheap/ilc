import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { sharedLibs } from './index';

describe('SharedLibShow', () => {
    it('shows a shared library', async () => {
        stubApi({ '/api/v1/shared_libs/forms': { name: 'forms', spaBundle: 'https://cdn.example.com/forms.js' } });
        renderResource('shared_libs', sharedLibs, '/shared_libs/forms/show');

        expect(await screen.findByText('Shared library "forms"')).toBeInTheDocument();
        expect(screen.getByText('@sharedLibrary/forms')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'Assets' }));
        expect(await screen.findByRole('link', { name: 'https://cdn.example.com/forms.js' })).toBeInTheDocument();
        // No assets discovery URL and no localization manifest
        expect(screen.getAllByText('<NULL>')).toHaveLength(2);
    });
});
