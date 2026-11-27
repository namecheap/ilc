import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { appRoutes } from './index';

const news = {
    id: 1,
    orderPos: 10,
    route: '/news/*',
    next: false,
    templateName: 'master',
    domainId: 1,
    meta: { protected: true },
    slots: { body: { appName: '@portal/news', kind: 'primary', props: { pageSize: 20 } } },
};

function stubRoute(route: object, routerDomains: object[] = []) {
    return stubApi({
        '/api/v1/route/1': route,
        '/api/v1/template': [{ name: 'master' }],
        '/api/v1/app': [{ name: '@portal/news' }],
        '/api/v1/router_domains': routerDomains,
    });
}

describe('AppRouteShow', () => {
    it('shows a route', async () => {
        stubRoute(news);
        renderResource('route', appRoutes, '/route/1/show');

        expect(await screen.findByText('Route #1')).toBeInTheDocument();
        expect(screen.getByText('/news/*')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(await screen.findByText('master')).toBeInTheDocument();
        expect(screen.queryByText('Special role')).not.toBeInTheDocument();
        // Only shown when ILC serves several domains
        expect(screen.queryByText('Domain')).not.toBeInTheDocument();
    });

    it('shows the domain of a route when there are router domains', async () => {
        stubRoute(news, [{ id: 1, domainName: 'example.com' }]);
        renderResource('route', appRoutes, '/route/1/show');

        expect(await screen.findByText('example.com')).toBeInTheDocument();
    });

    it('shows the apps in the slots of a route', async () => {
        stubRoute(news);
        renderResource('route', appRoutes, '/route/1/show');

        await userEvent.click(await screen.findByRole('tab', { name: 'Slots' }));

        expect(await screen.findByText('body')).toBeInTheDocument();
        expect(await screen.findByRole('link', { name: '@portal/news' })).toHaveAttribute(
            'href',
            '/app/%40portal%2Fnews',
        );
        expect(screen.getByText('Primary')).toBeInTheDocument();
        expect(screen.getByText('pageSize')).toBeInTheDocument();
    });

    it('shows the role of a special route, which has no path and may have no slots', async () => {
        stubRoute({ id: 1, specialRole: '404', templateName: 'master' });
        renderResource('route', appRoutes, '/route/1/show');

        expect(await screen.findByText('Special role')).toBeInTheDocument();
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.queryByText('Order position of the route')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'Slots' }));
        expect(await screen.findByText('There are no slots for this route')).toBeInTheDocument();
    });
});
