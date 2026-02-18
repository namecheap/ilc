import React from 'react';
import {
    Create,
    Edit,
    TextInput,
    required,
    TextField,
    ReferenceInput,
    SelectInput,
    TabbedForm,
    FormTab,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import JsonField from '../JsonField';
import Title from './Title';

const InputForm = ({ mode = 'edit', ...props }) => {
    return (
        <TabbedForm {...props}>
            <FormTab label="General">
                {mode === 'edit' ? <TextField source="id" /> : null}

                <TextInput source="domainName" fullWidth validate={required()} />
                <ReferenceInput
                    reference="template"
                    source="template500"
                    label="Template of 500 error"
                    validate={required()}
                >
                    <SelectInput resettable optionText="name" />
                </ReferenceInput>
                <TextInput source="canonicalDomain" label="Canonical Domain" fullWidth />
            </FormTab>

            <FormTab label="Domain Props">
                <JsonField
                    source="props"
                    label="Client Props"
                    helperText="Properties available in browser (e.g., API URLs, CDN URLs, feature flags)"
                    fullWidth
                />
                <JsonField
                    source="ssrProps"
                    label="SSR Props"
                    helperText="Server-side only properties (e.g., internal API URLs, secrets)"
                    fullWidth
                />
            </FormTab>
        </TabbedForm>
    );
};

export const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<Title />} undoable={false} {...props}>
        <InputForm mode="edit" />
    </Edit>
);

export const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <InputForm mode="create" />
        </Create>
    );
};
