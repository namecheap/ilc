import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    TextInput,
    required,
    TextField, FormTab,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import JsonField from '../JsonField/index';

const Title = ({ record }) => {
    return (<span>{record ? `Props set "${record.name}"` : ''}</span>);
};

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <SimpleForm initialValues={{ props: {} }} {...props}>
            {mode === 'edit'
                ? <TextField source="name" />
                : <TextInput source="name" fullWidth validate={required()} />}
            <JsonField source="props" label="Properties that will be passed to applications"/>
            <JsonField source="ssrProps" label="Properties that will be added to main props at SSR request, allow to override certain values" />
        </SimpleForm>
    );
};

export const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<Title />} undoable={false} {...props}>
        <InputForm mode="edit"/>
    </Edit>
);
export const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <InputForm mode="create"/>
        </Create>
    );
};
