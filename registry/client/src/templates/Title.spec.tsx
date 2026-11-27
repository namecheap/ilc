import { render, screen } from '@testing-library/react';
import { RecordContextProvider } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { Title } from './Title';

describe('templates Title', () => {
    it('names the record', () => {
        render(
            <RecordContextProvider value={{ id: 'master', name: 'master' }}>
                <Title />
            </RecordContextProvider>,
        );

        expect(screen.getByText('Template "master"')).toBeInTheDocument();
    });

    it('is empty while the record loads', () => {
        const { container } = render(<Title />);

        expect(container).toHaveTextContent(/^$/);
    });
});
