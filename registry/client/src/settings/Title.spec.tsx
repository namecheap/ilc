import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('settings Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 'baseUrl', key: 'baseUrl' }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Setting "baseUrl"')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
