import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dataProvider } from './dataProvider';

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), { status: 200, headers });
}

function lastRequest() {
    const [url, options] = vi.mocked(fetch).mock.lastCall ?? [];
    return {
        url,
        method: options?.method ?? 'GET',
        body: options?.body ? JSON.parse(String(options.body)) : undefined,
    };
}

describe('dataProvider', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reads a list in the shape the views work with', async () => {
        vi.mocked(fetch).mockResolvedValue(
            jsonResponse([{ name: '@portal/navbar', props: { a: 1 } }], { 'Content-Range': '1' }),
        );

        const { data, total } = await dataProvider.getList('app', {
            pagination: { page: 1, perPage: 25 },
            sort: { field: 'name', order: 'ASC' },
            filter: { q: 'nav' },
        });

        expect(total).toBe(1);
        expect(data).toEqual([{ id: '@portal/navbar', name: '@portal/navbar', props: { a: 1 } }]);
        expect(lastRequest().url).toContain('/api/v1/app?');
    });

    it('encodes a record name in the URL once', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ name: '@portal/navbar' }));

        const { data } = await dataProvider.getOne('app', { id: '@portal/navbar' });

        expect(lastRequest().url).toBe('/api/v1/app/%40portal%2Fnavbar');
        expect(data.id).toBe('@portal/navbar');
    });

    it('reads a setting overridden for a router domain by the id that carries the domain', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ key: 'baseUrl', value: 'https://example.com', domainId: 3 }));

        const { data } = await dataProvider.getOne('settings', { id: 'baseUrl@3' });

        expect(lastRequest().url).toBe('/api/v1/settings/baseUrl?domainId=3');
        expect(data).toMatchObject({ id: 'baseUrl@3', key: 'baseUrl', value: 'https://example.com', domainId: 3 });
    });

    it('reads a global setting by its key', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ key: 'baseUrl', value: 'https://example.com' }));

        const { data } = await dataProvider.getOne('settings', { id: 'baseUrl' });

        expect(lastRequest().url).toBe('/api/v1/settings/baseUrl');
        expect(data.id).toBe('baseUrl');
    });

    it('updates a setting overridden for a router domain by its key, with the domain in the body', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ key: 'baseUrl', value: 'https://example.org', domainId: 3 }));

        const { data } = await dataProvider.update('settings', {
            id: 'baseUrl@3',
            data: { id: 'baseUrl@3', key: 'baseUrl', value: 'https://example.org', domainId: 3, scope: 'ilc' },
            previousData: { id: 'baseUrl@3' },
        });

        expect(lastRequest()).toEqual({
            url: '/api/v1/settings/baseUrl',
            method: 'PUT',
            body: { key: 'baseUrl', value: 'https://example.org', domainId: 3 },
        });
        expect(data.id).toBe('baseUrl@3');
    });

    it('reverts a change recorded in the history', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ status: 'ok' }));

        await dataProvider.revertVersion(42);

        expect(lastRequest()).toMatchObject({ url: '/api/v1/versioning/42/revert', method: 'POST' });
    });

    it('fails a revert with the reason the API gives', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(JSON.stringify({ reason: 'The entity was changed since' }), { status: 400 }),
        );

        await expect(dataProvider.revertVersion(42)).rejects.toMatchObject({
            status: 400,
            body: { reason: 'The entity was changed since' },
        });
    });

    it('creates a record from form values', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ name: 'shared', props: { a: 1 } }));

        const { data } = await dataProvider.create('shared_props', { data: { name: 'shared', props: { a: 1 } } });

        expect(lastRequest()).toEqual({
            url: '/api/v1/shared_props',
            method: 'POST',
            body: { name: 'shared', props: { a: 1 } },
        });
        expect(data).toEqual({ id: 'shared', name: 'shared', props: { a: 1 } });
    });

    it('updates a record without its name, which cannot be changed', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ name: 'shared', props: { a: 2 } }));

        await dataProvider.update('shared_props', {
            id: 'shared',
            data: { id: 'shared', name: 'shared', props: { a: 2 } },
            previousData: { id: 'shared' },
        });

        expect(lastRequest()).toEqual({ url: '/api/v1/shared_props/shared', method: 'PUT', body: { props: { a: 2 } } });
    });

    it('sends the name of a record whose name is not its id', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 1, name: 'renamed' }));

        await dataProvider.update('versioning', { id: 1, data: { id: 1, name: 'renamed' }, previousData: { id: 1 } });

        expect(lastRequest().body).toEqual({ id: 1, name: 'renamed' });
    });

    it('deletes records one by one and reports their ids', async () => {
        vi.mocked(fetch).mockImplementation(async () => new Response(null, { status: 204 }));

        const { data } = await dataProvider.deleteMany('template', { ids: ['master', '500'] });

        expect(data).toEqual(['master', '500']);
        expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
            '/api/v1/template/master',
            '/api/v1/template/500',
        ]);
    });

    it('fails with the message of the API', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response('HTML template has invalid structure', { status: 422, statusText: 'Unprocessable Entity' }),
        );

        await expect(dataProvider.create('template', { data: { name: 'broken' } })).rejects.toMatchObject({
            message: 'HTML template has invalid structure',
            status: 422,
        });
    });
});
