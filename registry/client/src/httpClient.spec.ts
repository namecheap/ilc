import { describe, expect, it, vi } from 'vitest';

import { fetchJson } from './httpClient';

function answer(body: string | null, init?: ResponseInit) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, init)));
}

describe('fetchJson', () => {
    it('gives the parsed body of a response', async () => {
        answer('{"name":"@portal/navbar"}', { status: 200, headers: { 'Content-Range': 'items 0-1/1' } });

        const { status, json, headers } = await fetchJson('/api/v1/app/navbar');

        expect(status).toBe(200);
        expect(json).toEqual({ name: '@portal/navbar' });
        expect(headers.get('Content-Range')).toBe('items 0-1/1');
    });

    it('asks for JSON and sends a body as JSON', async () => {
        answer('{}', { status: 200 });

        await fetchJson('/api/v1/app', { method: 'POST', body: '{"name":"@portal/navbar"}' });

        const [, options] = vi.mocked(fetch).mock.lastCall ?? [];
        const sent = new Headers(options?.headers);
        expect(sent.get('Accept')).toBe('application/json');
        expect(sent.get('Content-Type')).toBe('application/json');
    });

    it('gives a body that is not JSON as a message', async () => {
        answer('', { status: 200 });

        await expect(fetchJson('/api/v1/app/navbar')).resolves.toMatchObject({ json: { message: '' } });
    });

    it('fails with the message and the body of an error response', async () => {
        answer('{"message":"App is used by a route"}', { status: 409 });

        await expect(fetchJson('/api/v1/app/navbar', { method: 'DELETE' })).rejects.toMatchObject({
            message: 'App is used by a route',
            status: 409,
            body: { message: 'App is used by a route' },
        });
    });

    it('fails with the text of an error response that is not JSON', async () => {
        answer('"name" is required', { status: 422 });

        await expect(fetchJson('/api/v1/app')).rejects.toMatchObject({
            message: '"name" is required',
            status: 422,
        });
    });

    it('fails with the status text when the error has no message', async () => {
        answer('{}', { status: 500, statusText: 'Internal Server Error' });

        await expect(fetchJson('/api/v1/app')).rejects.toMatchObject({ message: 'Internal Server Error', status: 500 });
    });
});
