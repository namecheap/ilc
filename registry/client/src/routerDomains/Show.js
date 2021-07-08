import React from 'react';
import {
    Show,
    SimpleShowLayout,
    TextField,
    ReferenceField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleShowLayout {...props} toolbar={null}>
                <TextField source="id" />

                <TextField source="domainName" />
                <ReferenceField reference="template"
                    source="template500"
                    label="Template of 500 error">
                    <TextField source="name" />
                </ReferenceField>
            </SimpleShowLayout>
        </Show>
    );
};
