import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('sharedLibs Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 'forms', name: 'forms' }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Shared library "forms"')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
