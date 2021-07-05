import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    TextInput,
    required,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <SimpleForm {...props}>
            {mode === 'edit'
                ? <TextField source="name" />
                : <TextInput source="name" fullWidth validate={required()} />}
            <TextInput source="content" multiline fullWidth />
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
