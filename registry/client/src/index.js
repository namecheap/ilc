/* eslint react/jsx-key: off */
import React from 'react';
import { Admin, Resource } from 'react-admin'; // eslint-disable-line import/no-unresolved
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

render(
    <Admin
        loginPage={LoginPage}
        authProvider={authProvider}
        dataProvider={dataProvider}
        title="ILC Registry"
        layout={Layout}
    >
        {permissions => [
            <Resource name="app" {...apps} />,
            <Resource name="shared_props" {...sharedProps} />,
            <Resource name="template" {...templates} />,
            <Resource name="route" {...appRoutes} />,
            <Resource name="auth_entities" {...authEntities} />,
            <Resource name="settings" {...settings} />,
        ]}
    </Admin>,
    document.getElementById('root')
);
