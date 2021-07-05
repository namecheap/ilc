import React from 'react';
import {
    Show,
    SimpleForm,
    TextInput,
    required,
    TextField,
    ReferenceInput,
    SelectInput,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleForm {...props} toolbar={null}>
                <TextField source="id" />

                <TextInput source="domainName" fullWidth validate={required()} disabled={true} />
                <ReferenceInput reference="template"
                    source="template500"
                    label="Template of 500 error"
                    validate={required()}>
                    <SelectInput resettable optionText="name" disabled={true} />
                </ReferenceInput>
            </SimpleForm>
        </Show>
    );
};
