import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    TextInput,
    required,
    TextField,
    ReferenceInput,
    SelectInput,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';

const InputForm = ({ mode = 'edit', ...props }) => {
    return (
        <SimpleForm {...props}>
            {mode === 'edit'
                ? <TextField source="id" />
                : null}

            <TextInput source="domainName" fullWidth validate={required()} />
            <ReferenceInput reference="template"
                source="template500"
                label="Template of 500 error"
                validate={required()}>
                <SelectInput resettable optionText="name" />
            </ReferenceInput>
        </SimpleForm>
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
