import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    TextInput,
    required,
    TextField,
    usePermissions,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import { CustomBottomToolbar } from '../components';

const Title = ({ record }) => {
    return (<span>{record ? `Template "${record.name}"` : ''}</span>);
};

const InputForm = ({mode = 'edit', ...props}) => {
    const { permissions } = usePermissions();

    return (
        <SimpleForm {...props} toolbar={<CustomBottomToolbar />}>
            {mode === 'edit'
                ? <TextField source="name" />
                : <TextInput source="name" fullWidth validate={required()} disabled={permissions?.input.disabled} />}
            <TextInput source="content" multiline fullWidth disabled={permissions?.input.disabled} />
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
