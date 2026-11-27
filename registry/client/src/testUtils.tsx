import { render } from '@testing-library/react';
import Cookies from 'js-cookie';
import type { ReactNode } from 'react';
import { Admin, Resource, TestMemoryRouter, memoryStore } from 'react-admin';
import { vi } from 'vitest';

import type { ResourcePages } from './App';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';

export interface ApiRequest {
    method: string;
    /** Decoded, so a record name reads as it is: /api/v1/app/@portal/navbar */
    path: string;
    query: URLSearchParams;
    body: unknown;
}

/**
 * What the stubbed Registry answers, by "METHOD /path", or by the path alone for a GET.
 * A value is the JSON body, a function gets the request and returns the body or a whole Response.
 */
export type ApiRoutes = Record<string, unknown>;

function respond(routes: ApiRoutes, request: ApiRequest): Response {
    const key = `${request.method} ${request.path}`;
    let answer: unknown;

    if (key in routes) {
        answer = routes[key];
    } else if (request.method === 'GET') {
        if (!(request.path in routes)) {
            return new Response(JSON.stringify({ message: `No stub for ${key}` }), { status: 404 });
        }
        answer = routes[request.path];
    } else if (request.method === 'DELETE') {
        return new Response(null, { status: 204 });
    } else {
        // A write answers with the record as it is after the write
        answer = Object.assign({}, routes[request.path], request.body);
    }

    if (typeof answer === 'function') {
        answer = answer(request);
    }
    if (answer instanceof Response) {
        return answer;
    }

    const headers = Array.isArray(answer)
        ? { 'Content-Range': `items 0-${answer.length}/${answer.length}` }
        : undefined;
    return new Response(JSON.stringify(answer), { status: 200, headers });
}

/**
 * Replaces `fetch` with a Registry that answers from `routes`, and gives the requests it gets.
 */
export function stubApi(routes: ApiRoutes): ApiRequest[] {
    const requests: ApiRequest[] = [];

    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string, options: RequestInit = {}) => {
            const url = new URL(input, 'http://localhost');
            const request: ApiRequest = {
                method: options.method ?? 'GET',
                path: decodeURIComponent(url.pathname),
                query: url.searchParams,
                body: options.body ? JSON.parse(String(options.body)) : undefined,
            };
            requests.push(request);

            return respond(routes, request);
        }),
    );

    return requests;
}

/** An answer of the stubbed Registry that fails the request */
export function apiError(status: number, body: object) {
    return () => new Response(JSON.stringify(body), { status });
}

/** The filter a list request asks for */
export function filterOf(request: ApiRequest): Record<string, unknown> {
    return JSON.parse(request.query.get('filter') ?? '{}');
}

/** The requests that change data */
export function writes(requests: ApiRequest[]) {
    return requests.filter((request) => request.method !== 'GET');
}

/** Makes the lists render as on a phone: the media queries for a narrow screen match */
export function stubSmallScreen() {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
    }));
}

/** No app bar and menu, only the element the page title is rendered into */
function BareLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <div id="react-admin-title" />
            {children}
        </>
    );
}

interface RenderOptions {
    role?: 'admin' | 'readonly';
    /** Gets every location the router moves to */
    onLocation?: (location: { pathname: string; search: string }) => void;
}

/**
 * Renders the pages of a resource as the app does, at a route such as "/app", "/app/create", "/app/navbar"
 * (edit) or "/app/navbar/show", over the real data and auth providers. Stub the API first.
 */
export function renderResource(name: string, pages: ResourcePages, route: string, options: RenderOptions = {}) {
    Cookies.set('ilcUserInfo', JSON.stringify({ identifier: 'root', role: options.role ?? 'admin' }));

    return render(
        <TestMemoryRouter initialEntries={[route]} locationCallback={options.onLocation}>
            <Admin authProvider={authProvider} dataProvider={dataProvider} layout={BareLayout} store={memoryStore()}>
                <Resource name={name} {...pages} />
            </Admin>
        </TestMemoryRouter>,
    );
}
