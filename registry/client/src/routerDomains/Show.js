import React from 'react';
import { Show, SimpleShowLayout, TextField, ReferenceField } from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';
import { JsonFieldShow } from '../JsonField';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleShowLayout {...props} toolbar={null}>
                <TextField source="id" />

                <TextField source="domainName" />
                <ReferenceField reference="template" source="template500" label="Template of 500 error">
                    <TextField source="name" />
                </ReferenceField>
                <TextField source="canonicalDomain" label="Canonical Domain" emptyText="-" />
                <JsonFieldShow source="props" label="Properties that will be passed to applications" />
                <JsonFieldShow
                    source="ssrProps"
                    label="Properties that will be added to main props at SSR request, allow to override certain values"
                />
            </SimpleShowLayout>
        </Show>
    );
};
