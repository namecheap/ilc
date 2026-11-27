import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { appRoutes } from './index';

const news = {
    id: 1,
    orderPos: 10,
    route: '/news/*',
    next: false,
    templateName: 'master',
    slots: { body: { appName: '@portal/news', kind: 'primary', props: { pageSize: 20 } } },
};

function stubRoutes(routes: Record<string, unknown> = {}) {
    return stubApi({
        '/api/v1/route/1': news,
        '/api/v1/template': [{ name: 'master' }],
        '/api/v1/app': [{ name: '@portal/news', kind: 'primary' }],
        '/api/v1/router_domains': [],
        ...routes,
    });
}

async function save() {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('AppRouteEdit', () => {
    it('updates a route, with its slots by name', async () => {
        const requests = stubRoutes();
        renderResource('route', appRoutes, '/route/1');

        expect(await screen.findByText('Route #1')).toBeInTheDocument();
        const path = screen.getByRole('textbox', { name: 'Route' });
        await userEvent.clear(path);
        await userEvent.type(path, '/blog/*');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toEqual({
            method: 'PUT',
            path: '/api/v1/route/1',
            query: expect.anything(),
            body: {
                orderPos: 10,
                route: '/blog/*',
                next: false,
                templateName: 'master',
                slots: { body: { appName: '@portal/news', kind: 'primary', props: { pageSize: 20 } } },
            },
        });
    });

    it('edits the slots as a list', async () => {
        stubRoutes();
        renderResource('route', appRoutes, '/route/1');

        await userEvent.click(await screen.findByRole('tab', { name: 'Slots' }));

        expect(screen.getByRole('textbox', { name: 'Slot name' })).toHaveValue('body');
        expect(await screen.findByRole('combobox', { name: 'App name' })).toHaveValue('@portal/news');
    });

    it('offers a domain when there are router domains', async () => {
        stubRoutes({ '/api/v1/router_domains': [{ id: 1, domainName: 'example.com' }] });
        renderResource('route', appRoutes, '/route/1');

        expect(await screen.findByRole('combobox', { name: 'Domain' })).toBeInTheDocument();
        expect(screen.getByText(/^If you choose domain then you current route will be used only/)).toBeInTheDocument();
    });

    it('has no domain to choose without router domains', async () => {
        stubRoutes();
        renderResource('route', appRoutes, '/route/1');

        await screen.findByRole('textbox', { name: 'Route' });
        expect(screen.queryByRole('combobox', { name: 'Domain' })).not.toBeInTheDocument();
    });

    it('edits the role of a special route instead of a path', async () => {
        stubRoutes({ '/api/v1/route/1': { id: 1, specialRole: '404', templateName: 'master' } });
        renderResource('route', appRoutes, '/route/1');

        expect(await screen.findByRole('combobox', { name: 'Special role' })).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Route' })).not.toBeInTheDocument();
    });
});

describe('AppRouteCreate', () => {
    it('creates a route', async () => {
        const requests = stubRoutes({ '/api/v1/route/2': { ...news, id: 2 } });
        renderResource('route', appRoutes, '/route/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Route' }), '/blog/*');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'POST',
            path: '/api/v1/route',
            body: { route: '/blog/*', next: false },
        });
        // An empty JSON editor is no metadata at all
        expect(writes(requests)[0].body).not.toHaveProperty('meta');
    });

    it('does not create a route without a path', async () => {
        const requests = stubRoutes();
        renderResource('route', appRoutes, '/route/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Namespace' }), 'portal');
        await save();

        expect(await screen.findByText('Required')).toBeInTheDocument();
        expect(writes(requests)).toHaveLength(0);
    });

    it('creates a special route, which needs a role and a template', async () => {
        const requests = stubRoutes({ 'POST /api/v1/route': { id: 2, specialRole: '404', templateName: 'master' } });
        renderResource('route', appRoutes, '/route/create?special=1');

        await userEvent.click(await screen.findByRole('combobox', { name: /Special role/ }));
        await userEvent.click(screen.getByRole('option', { name: '404' }));
        await save();

        // The template is still missing
        expect(await screen.findByText('Required')).toBeInTheDocument();
        expect(writes(requests)).toHaveLength(0);

        await userEvent.click(screen.getByRole('combobox', { name: /Template name/ }));
        await userEvent.click(await screen.findByRole('option', { name: 'master' }));
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0].body).toMatchObject({ specialRole: '404', templateName: 'master' });
    });
});
