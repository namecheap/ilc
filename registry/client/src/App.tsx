import { Admin, CustomRoutes, Resource, type ResourceProps } from 'react-admin';
import { Route } from 'react-router-dom';

import { appRoutes } from './appRoutes';
import { apps } from './apps';
import { authEntities } from './authEntities';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';
import { OAuthErrorPage } from './OAuthErrorPage';
import { routerDomains } from './routerDomains';
import { settings } from './settings';
import { sharedLibs } from './sharedLibs';
import { sharedProps } from './sharedProps';
import { templates } from './templates';
import { versioning } from './versioning';

export type ResourcePages = Omit<ResourceProps, 'name'>;

/**
 * A read-only user gets the show view on the edit route too, so a link to a record never opens a form,
 * and no create page. Which buttons they see is decided by `authProvider.canAccess`.
 */
function pagesFor(permissions: unknown, pages: ResourcePages): ResourcePages {
    return permissions === 'readonly' ? { ...pages, edit: pages.show, create: undefined } : pages;
}

export function App() {
    return (
        <Admin
            loginPage={LoginPage}
            authProvider={authProvider}
            dataProvider={dataProvider}
            title="ILC Registry"
            layout={Layout}
            // Light only, as the JSON editor and the history diff have no dark look
            darkTheme={null}
        >
            <CustomRoutes noLayout>
                <Route path="/oauth/error" element={<OAuthErrorPage />} />
            </CustomRoutes>
            {(permissions) => (
                <>
                    <Resource name="app" {...pagesFor(permissions, apps)} />
                    <Resource name="shared_props" {...pagesFor(permissions, sharedProps)} />
                    <Resource name="shared_libs" {...pagesFor(permissions, sharedLibs)} />
                    <Resource name="template" {...pagesFor(permissions, templates)} />
                    <Resource name="route" {...pagesFor(permissions, appRoutes)} />
                    <Resource name="router_domains" {...pagesFor(permissions, routerDomains)} />
                    <Resource name="auth_entities" {...pagesFor(permissions, authEntities)} />
                    <Resource name="settings" {...pagesFor(permissions, settings)} />
                    <Resource name="versioning" {...pagesFor(permissions, versioning)} />
                </>
            )}
        </Admin>
    );
}
