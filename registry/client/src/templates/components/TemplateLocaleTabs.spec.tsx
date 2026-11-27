import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TemplateLocaleTabs } from './TemplateLocaleTabs';

describe('TemplateLocaleTabs', () => {
    it('has a tab for the default content and one for every locale', () => {
        render(<TemplateLocaleTabs locales={['ua-UA', 'es-MX']} value={1} onChange={() => {}} />);

        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Default', 'ua-UA', 'es-MX']);
        expect(screen.getByRole('tab', { name: 'ua-UA' })).toHaveAttribute('aria-selected', 'true');
    });

    it('tells which tab a user opens', async () => {
        const onChange = vi.fn();
        render(<TemplateLocaleTabs locales={['ua-UA', 'es-MX']} value={0} onChange={onChange} />);

        await userEvent.click(screen.getByRole('tab', { name: 'es-MX' }));

        expect(onChange).toHaveBeenCalledWith(2);
    });
});
