import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('appRoutes Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 7 }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Route #7')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
