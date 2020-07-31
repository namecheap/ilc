import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    SelectInput,
    TextInput,
    required,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

const Title = ({ record }) => {
    return (<span>{record ? `Auth Entity "${record.identifier}"` : ''}</span>);
};

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <SimpleForm {...props}>
            {mode === 'edit'
                ? <TextField source="identifier" />
                : <TextInput source="identifier" fullWidth validate={required()} />}
            {mode === 'edit'
                ? <TextField source="provider" />
                : <SelectInput source="provider" fullWidth validate={required()} choices={[
                    { id: 'bearer', name: 'Bearer' },
                    { id: 'local', name: 'Local' },
                    { id: 'openid', name: 'OpenID' },
                ]} />}
            <SelectInput source="role" fullWidth validate={required()} choices={[
                { id: 'admin', name: 'Admin' },
                { id: 'user', name: 'User' },
            ]} />
            <TextInput source="secret" fullWidth />
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
