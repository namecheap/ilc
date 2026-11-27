import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminContext, Edit, RefreshButton, defaultI18nProvider } from 'react-admin';
import { describe, expect, it, vi } from 'vitest';

import { dataProvider } from '../dataProvider';
import { renderResource, stubApi, writes } from '../testUtils';

import { TemplateForm } from './Edit';
import { templates } from './index';

const content = '<html><head></head><body></body></html>';

/** Renders the edit form of a template over a stubbed API and collects the bodies of the updates it sends */
function renderTemplate(localizedVersions: Record<string, { content: string }>) {
    const saved: Record<string, unknown>[] = [];
    const responses: Record<string, unknown> = {
        '/api/v1/template/master': { name: 'master', content, localizedVersions },
        '/api/v1/settings/i18n.supported.locale': { key: 'i18n.supported.locale', value: ['en-US', 'ua-UA', 'es-MX'] },
        '/api/v1/settings/i18n.default.locale': { key: 'i18n.default.locale', value: 'en-US' },
    };
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, options?: RequestInit) => {
            if (options?.method === 'PUT') {
                saved.push(JSON.parse(String(options.body)));
            }
            return new Response(JSON.stringify(responses[url]), { status: 200 });
        }),
    );

    render(
        <AdminContext dataProvider={dataProvider} i18nProvider={defaultI18nProvider}>
            <Edit resource="template" id="master" mutationMode="pessimistic">
                <TemplateForm mode="edit" />
            </Edit>
        </AdminContext>,
    );

    return saved;
}

/** Saves the form and gives the data it sends */
async function save(saved: Record<string, unknown>[]) {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saved).toHaveLength(1));

    return saved[0];
}

describe('template form', () => {
    it('shows a tab for the default content and for every localized version', async () => {
        renderTemplate({ 'ua-UA': { content: 'ua' } });

        expect(await screen.findByRole('tab', { name: 'Default' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'ua-UA' })).toBeInTheDocument();
        expect(screen.getByLabelText('Content')).toHaveValue(content);
    });

    it('saves a template without the locale that was removed, even when it was the only one', async () => {
        const saved = renderTemplate({ 'ua-UA': { content: 'ua' } });

        await userEvent.click(await screen.findByRole('tab', { name: 'ua-UA' }));
        expect(screen.getByLabelText('Content for ua-UA language')).toHaveValue('ua');
        await userEvent.click(screen.getByRole('button', { name: 'Remove Current Locale' }));

        expect(screen.queryByRole('tab', { name: 'ua-UA' })).not.toBeInTheDocument();
        expect(await save(saved)).toMatchObject({ content, localizedVersions: {} });
    });

    it('keeps the other locales when one is removed', async () => {
        const saved = renderTemplate({ 'ua-UA': { content: 'ua' }, 'es-MX': { content: 'es' } });

        await userEvent.click(await screen.findByRole('tab', { name: 'ua-UA' }));
        await userEvent.click(screen.getByRole('button', { name: 'Remove Current Locale' }));

        expect((await save(saved)).localizedVersions).toEqual({ 'es-MX': { content: 'es' } });
    });

    it('adds a locale that is supported and not used yet', async () => {
        const saved = renderTemplate({ 'ua-UA': { content: 'ua' } });

        await userEvent.click(await screen.findByRole('button', { name: 'Add Locale' }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('combobox'));
        // The default locale and the one the template already has are not offered
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['es-MX']);
        await userEvent.click(screen.getByRole('option', { name: 'es-MX' }));
        await userEvent.click(within(dialog).getByRole('button', { name: 'Add Locale' }));

        await userEvent.click(await screen.findByRole('tab', { name: 'es-MX' }));
        await userEvent.type(screen.getByLabelText('Content for es-MX language'), 'es');

        expect((await save(saved)).localizedVersions).toEqual({
            'ua-UA': { content: 'ua' },
            'es-MX': { content: 'es' },
        });
    });
});

describe('TemplateEdit', () => {
    it('edits a template under its name', async () => {
        stubApi({ '/api/v1/template/master': { name: 'master', content } });
        renderResource('template', templates, '/template/master');

        expect(await screen.findByText('Template "master"')).toBeInTheDocument();
        expect(screen.getByLabelText('Content')).toHaveValue(content);
        expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    });

    it('opens the default content when the locale of the open tab is gone after a refresh', async () => {
        let localizedVersions: object = { 'ua-UA': { content: 'ua' } };
        stubApi({
            '/api/v1/template/master': () => ({ name: 'master', content, localizedVersions }),
            '/api/v1/settings/i18n.supported.locale': { key: 'i18n.supported.locale', value: [] },
            '/api/v1/settings/i18n.default.locale': { key: 'i18n.default.locale', value: 'en-US' },
        });
        render(
            <AdminContext dataProvider={dataProvider} i18nProvider={defaultI18nProvider}>
                <RefreshButton />
                <Edit resource="template" id="master" mutationMode="pessimistic">
                    <TemplateForm mode="edit" />
                </Edit>
            </AdminContext>,
        );
        await userEvent.click(await screen.findByRole('tab', { name: 'ua-UA' }));

        // Somebody else removed the locale in the meantime
        localizedVersions = {};
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => expect(screen.queryByRole('tab', { name: 'ua-UA' })).not.toBeInTheDocument());
        expect(screen.getByRole('tab', { name: 'Default' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByLabelText('Content')).toHaveValue(content);
    });

    it('closes the locale dialog without a change when it is cancelled', async () => {
        stubApi({
            '/api/v1/template/master': { name: 'master', content },
            '/api/v1/settings/i18n.supported.locale': { key: 'i18n.supported.locale', value: ['en-US', 'ua-UA'] },
            '/api/v1/settings/i18n.default.locale': { key: 'i18n.default.locale', value: 'en-US' },
        });
        renderResource('template', templates, '/template/master');

        await userEvent.click(await screen.findByRole('button', { name: 'Add Locale' }));
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getAllByRole('tab')).toHaveLength(1);
    });
});

describe('TemplateCreate', () => {
    it('creates a template', async () => {
        const requests = stubApi({ '/api/v1/template/error': { name: 'error', content: '<html></html>' } });
        renderResource('template', templates, '/template/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'error');
        await userEvent.type(screen.getByRole('textbox', { name: 'Content' }), '<html></html>');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'POST',
            path: '/api/v1/template',
            body: { name: 'error', content: '<html></html>' },
        });
    });

    it('does not create a template without a name', async () => {
        const requests = stubApi({});
        renderResource('template', templates, '/template/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Content' }), '<html></html>');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Required')).toBeInTheDocument();
        expect(writes(requests)).toHaveLength(0);
    });
});
