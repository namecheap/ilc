import React from 'react';
import {
    Show,
    Tab,
    TabbedShowLayout,
    TextField,
    UrlField,
    FunctionField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

import Title from './Title';
import { ShowTopToolbar } from '../components';
import { EMPTY_TEXT } from '../constants';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show {...props} title={<Title />} actions={<ShowTopToolbar />}>
            <TabbedShowLayout {...props} toolbar={null}>
                <Tab label="Summary">
                    <FunctionField
                        label="Name"
                        render={record => `@sharedLibrary/${record.name}`}
                    />
                    <TextField source="adminNotes" component="pre" emptyText={EMPTY_TEXT} />
                </Tab>
                <Tab label="Assets">
                    <UrlField source="assetsDiscoveryUrl" emptyText={EMPTY_TEXT} />
                    <UrlField source="spaBundle" />
                    <UrlField source="l10nManifest" emptyText={EMPTY_TEXT} />
                </Tab>
            </TabbedShowLayout>
        </Show>
    );
};
