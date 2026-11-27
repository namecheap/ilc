import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('authEntities Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 1, identifier: 'root' }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Auth Entity "root"')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
