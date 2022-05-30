import React from 'react';
import {
    Show,
    Tab,
    TabbedShowLayout,
    ArrayField,
    TextField,
    Datagrid,
    UrlField,
    ReferenceArrayField,
    SingleFieldList,
    ChipField,
    SelectField,
    ReferenceField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

import { JsonFieldShow } from '../JsonField';
import Title from './Title';
import { ShowTopToolbar } from '../components';
import { EMPTY_TEXT, APP_KINDS_WITH_WRAPPER } from '../constants';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show {...props} title={<Title />} actions={<ShowTopToolbar />}>
            <TabbedShowLayout initialValues={{ dependencies: [] }} {...props} toolbar={null}>
                <Tab label="Summary">
                    <TextField source="name" />
                    <SelectField
                        source="kind"
                        choices={APP_KINDS_WITH_WRAPPER}
                    />
                    <ReferenceField
                        source="enforceDomain"
                        reference="router_domains"
                        emptyText={EMPTY_TEXT}>
                        <TextField source="domainName" />
                    </ReferenceField>
                    <TextField source="wrappedWith" emptyText={EMPTY_TEXT} />
                    <JsonFieldShow
                        source="discoveryMetadata"
                        label="Discovery metadata (can be used to retrieve apps filtered by some metadata fields)."
                    />
                    <TextField source="adminNotes" component="pre" emptyText={EMPTY_TEXT} />
                </Tab>
                <Tab label="Assets">
                    <UrlField source="assetsDiscoveryUrl" emptyText={EMPTY_TEXT} />
                    <UrlField source="spaBundle" />
                    <UrlField source="cssBundle" emptyText={EMPTY_TEXT} />
                    <ArrayField source="dependencies">
                        <Datagrid>
                            <TextField label="Name" source="key" />
                            <UrlField label="URL" source="value" />
                        </Datagrid>
                    </ArrayField>
                </Tab>
                <Tab label="SSR">
                    <UrlField source="ssr.src" label="URL" emptyText={EMPTY_TEXT} />
                    <TextField source="ssr.timeout" label="Request timeout, in ms" emptyText={EMPTY_TEXT} />
                </Tab>
                <Tab label="Props">
                    <ReferenceArrayField reference="shared_props" source="configSelector" label="Shared props selector">
                        <SingleFieldList>
                            <ChipField source="name" />
                        </SingleFieldList>
                    </ReferenceArrayField>
                    <JsonFieldShow
                        source="props"
                        label="Properties that will be passed to application"
                    />
                    <JsonFieldShow
                        source="ssrProps"
                        label="Properties that will be added to main props at SSR request, allow to override certain values"
                    />
                </Tab>
            </TabbedShowLayout>
        </Show>
    );
};
