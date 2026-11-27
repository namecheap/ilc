import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { OAuthErrorPage } from './OAuthErrorPage';

function renderAt(route: string) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <OAuthErrorPage />
        </MemoryRouter>,
    );
}

describe('OAuthErrorPage', () => {
    it('shows the error and its description from the query', () => {
        renderAt('/oauth/error?error=invalid_client&error_description=Unknown%20client');

        expect(screen.getByText('Authorization failed')).toBeInTheDocument();
        expect(screen.getByText('invalid_client')).toBeInTheDocument();
        expect(screen.getByText(/Unknown client/)).toBeInTheDocument();
    });

    it('shows a generic error when the query names none', () => {
        renderAt('/oauth/error');

        expect(screen.getByText('invalid_request')).toBeInTheDocument();
    });

    it('links to the login page', () => {
        renderAt('/oauth/error');

        expect(screen.getByRole('link', { name: 'Go to the login page' })).toHaveAttribute('href', '#/login');
    });
});
