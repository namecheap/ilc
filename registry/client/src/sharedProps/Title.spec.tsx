import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('sharedProps Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 'shared', name: 'shared' }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Props set "shared"')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
