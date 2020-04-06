/* eslint react/jsx-key: off */
import React from 'react';
import { Admin, Resource } from 'react-admin'; // eslint-disable-line import/no-unresolved
import { render } from 'react-dom';

import authProvider from './authProvider';
import dataProvider from './dataProvider';
import Layout from './Layout';
import apps from './apps';
import sharedProps from './sharedProps';
import templates from './templates';

render(
    <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        title="ILC Registry"
        layout={Layout}
    >
        {permissions => [
            <Resource name="app" {...apps} />,
            <Resource name="shared_props" {...sharedProps} />,
            <Resource name="template" {...templates} />,
        ]}
    </Admin>,
    document.getElementById('root')
);
