/* eslint react/jsx-key: off */
import React from 'react';
import { Admin, Resource } from 'react-admin'; // eslint-disable-line import/no-unresolved
import { render } from 'react-dom';
import { Route } from 'react-router-dom';

import authProvider from './authProvider';
import comments from './comments';
import CustomRouteLayout from './customRouteLayout';
import CustomRouteNoLayout from './customRouteNoLayout';
import dataProvider from './dataProvider';
import Layout from './Layout';
import apps from './apps';
import users from './users';
import tags from './tags';

render(
    <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        title="ILC Registry"
        layout={Layout}
        customRoutes={[
            <Route
                exact
                path="/custom"
                component={props => <CustomRouteNoLayout {...props} />}
                noLayout
            />,
            <Route
                exact
                path="/custom2"
                component={props => <CustomRouteLayout {...props} />}
            />,
        ]}
    >
        {permissions => [
            <Resource name="apps" {...apps} />,
            <Resource name="comments" {...comments} />,
            permissions ? <Resource name="users" {...users} /> : null,
            <Resource name="tags" {...tags} />,
        ]}
    </Admin>,
    document.getElementById('root')
);
