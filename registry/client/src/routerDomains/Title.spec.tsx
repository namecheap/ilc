import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('routerDomains Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 3 }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Router Domains #3')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
