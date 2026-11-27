import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./App', () => ({
    App() {
        return <p>ILC Registry</p>;
    },
}));

describe('entry point', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders the app into the root element of index.html', async () => {
        document.body.innerHTML = '<div id="root"></div>';

        await import('./index');

        expect(await screen.findByText('ILC Registry')).toBeInTheDocument();
        expect(document.getElementById('root')).toContainElement(screen.getByText('ILC Registry'));
    });
});
