import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('apps Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: '@portal/navbar', name: '@portal/navbar' }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('App "@portal/navbar"')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
