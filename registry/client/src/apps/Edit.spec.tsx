import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { apps } from './index';

const navbar = {
    name: '@portal/navbar',
    kind: 'essential',
    spaBundle: 'https://cdn.example.com/navbar.js',
    dependencies: { react: 'https://cdn.example.com/react.js' },
    props: { publicPath: '/navbar/' },
    configSelector: ['shared'],
};

function stubApps(routes: Record<string, unknown> = {}) {
    return stubApi({
        '/api/v1/app/@portal/navbar': navbar,
        '/api/v1/app': [{ name: '@portal/wrapper', kind: 'wrapper' }],
        '/api/v1/shared_props': [{ name: 'shared' }],
        '/api/v1/router_domains': [],
        ...routes,
    });
}

async function save() {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('AppEdit', () => {
    it('updates an app, whose name cannot be changed', async () => {
        const requests = stubApps();
        renderResource('app', apps, '/app/%40portal%2Fnavbar');

        expect(await screen.findByText('App "@portal/navbar"')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
        await userEvent.type(screen.getByRole('textbox', { name: 'Namespace' }), 'portal');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'PUT',
            path: '/api/v1/app/@portal/navbar',
            body: {
                kind: 'essential',
                namespace: 'portal',
                spaBundle: 'https://cdn.example.com/navbar.js',
                dependencies: { react: 'https://cdn.example.com/react.js' },
                props: { publicPath: '/navbar/' },
                configSelector: ['shared'],
            },
        });
        expect(writes(requests)[0].body).not.toHaveProperty('name');
    });

    it('edits the dependencies as a list', async () => {
        stubApps();
        renderResource('app', apps, '/app/%40portal%2Fnavbar');

        await userEvent.click(await screen.findByRole('tab', { name: 'Assets' }));

        expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('react');
        expect(screen.getByRole('textbox', { name: 'URL' })).toHaveValue('https://cdn.example.com/react.js');
    });

    it('offers the wrapper apps to wrap an app with, but not for a wrapper itself', async () => {
        stubApps();
        renderResource('app', apps, '/app/%40portal%2Fnavbar');

        expect(await screen.findByRole('combobox', { name: 'Wrapped with' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('combobox', { name: /Kind/ }));
        await userEvent.click(screen.getByRole('option', { name: 'Wrapper' }));

        expect(screen.queryByRole('combobox', { name: 'Wrapped with' })).not.toBeInTheDocument();
    });

    it('needs no SPA bundle when the assets discovery provides it', async () => {
        stubApps();
        renderResource('app', apps, '/app/%40portal%2Fnavbar');

        await userEvent.click(await screen.findByRole('tab', { name: 'Assets' }));
        expect(screen.getByRole('textbox', { name: /Spa bundle/ })).toBeEnabled();
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Assets discovery url' }),
            'https://cdn.example.com/assets.json',
        );

        expect(screen.getByRole('textbox', { name: /Spa bundle/ })).toBeDisabled();
        expect(screen.getByText(/^Do not need to specify SPA bundle, CSS bundle, dependencies/)).toBeInTheDocument();
    });
});

describe('AppCreate', () => {
    it('creates an app', async () => {
        const requests = stubApps({ '/api/v1/app/@portal/footer': { name: '@portal/footer', kind: 'regular' } });
        renderResource('app', apps, '/app/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), '@portal/footer');
        await userEvent.click(screen.getByRole('combobox', { name: /Kind/ }));
        await userEvent.click(screen.getByRole('option', { name: 'Regular' }));
        await userEvent.click(screen.getByRole('tab', { name: 'Assets' }));
        await userEvent.type(screen.getByRole('textbox', { name: /Spa bundle/ }), 'https://cdn.example.com/footer.js');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'POST',
            path: '/api/v1/app',
            body: {
                name: '@portal/footer',
                kind: 'regular',
                spaBundle: 'https://cdn.example.com/footer.js',
                dependencies: {},
            },
        });
    });

    it('does not create an app without a name, a kind and a bundle', async () => {
        const requests = stubApps();
        renderResource('app', apps, '/app/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Namespace' }), 'portal');
        await save();

        expect(await screen.findAllByText('Required')).not.toHaveLength(0);
        expect(writes(requests)).toHaveLength(0);
    });
});
