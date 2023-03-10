/* eslint react/jsx-key: off */
import React from 'react';
import { Admin, Resource, Route } from 'react-admin'; // eslint-disable-line import/no-unresolved
import { render } from 'react-dom';

import LoginPage from './LoginPage';
import authProvider from './authProvider';
import dataProvider from './dataProvider';
import Layout from './Layout';
import apps from './apps';
import sharedProps from './sharedProps';
import templates from './templates';
import appRoutes from './appRoutes';
import authEntities from './authEntities';
import settings from './settings';
import versioning from './versioning';
import routerDomains from './routerDomains';
import sharedLibs from './sharedLibs';

render(
    <Admin
        loginPage={LoginPage}
        authProvider={authProvider}
        dataProvider={dataProvider}
        title="ILC Registry"
        layout={Layout}
    >
        {permissions => {
            const filterPermissions = pages => {
                if (permissions === 'readonly')  {
                    return {
                        ...pages,
                        edit: pages.show,
                    };
                }

                return pages;
            };

            return [
                <Resource name="app" {...filterPermissions(apps)} />,
                <Resource name="shared_props" {...filterPermissions(sharedProps)} />,
                <Resource name="shared_libs" {...filterPermissions(sharedLibs)} />,
                <Resource name="template" {...filterPermissions(templates)} />,
                <Resource name="route" {...filterPermissions(appRoutes)} />,
                <Resource name="router_domains" {...filterPermissions(routerDomains)} />,
                <Resource name="auth_entities" {...filterPermissions(authEntities)} />,
                <Resource name="settings" {...filterPermissions(settings)} />,
                <Resource name="versioning" {...filterPermissions(versioning)} />,
            ]
        }}
    </Admin>,
    document.getElementById('root')
);
