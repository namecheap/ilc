/* eslint react/jsx-key: off */
import React from 'react';
import { Admin, Resource } from 'react-admin'; // eslint-disable-line import/no-unresolved
import { render } from 'react-dom';

import authProvider from './authProvider';
import dataProvider from './dataProvider';
import Layout from './Layout';
import apps from './apps';

render(
    <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        title="ILC Registry"
        layout={Layout}
    >
        {permissions => [
            <Resource name="app" {...apps} />,
        ]}
    </Admin>,
    document.getElementById('root')
);
