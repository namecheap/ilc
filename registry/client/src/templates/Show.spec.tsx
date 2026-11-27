import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { templates } from './index';

describe('TemplateShow', () => {
    it('shows the default content of a template and its localized versions', async () => {
        stubApi({
            '/api/v1/template/master': {
                name: 'master',
                content: '<html lang="en"></html>',
                localizedVersions: { 'ua-UA': { content: '<html lang="uk"></html>' } },
            },
        });
        renderResource('template', templates, '/template/master/show');

        expect(await screen.findByText('Template "master"')).toBeInTheDocument();
        expect(screen.getByText('<html lang="en"></html>')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'ua-UA' }));
        expect(screen.getByText('<html lang="uk"></html>')).toBeInTheDocument();
        expect(screen.queryByText('<html lang="en"></html>')).not.toBeInTheDocument();
    });

    it('shows a template that has no localized versions', async () => {
        stubApi({ '/api/v1/template/master': { name: 'master', content: '<html></html>' } });
        renderResource('template', templates, '/template/master/show');

        expect(await screen.findByText('<html></html>')).toBeInTheDocument();
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Default']);
    });
});
