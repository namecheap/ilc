import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    SelectInput,
    TextInput,
    required,
    TextField,
    usePermissions,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import { CustomBottomToolbar } from '../components';

const Title = ({ record }) => {
    return (<span>{record ? `Auth Entity "${record.identifier}"` : ''}</span>);
};

const InputForm = ({mode = 'edit', ...props}) => {
    const { permissions } = usePermissions();

    return (
        <SimpleForm {...props} toolbar={<CustomBottomToolbar />}>
            {mode === 'edit'
                ? <TextField source="identifier" />
                : <TextInput source="identifier" fullWidth validate={required()} disabled={permissions?.input.disabled} />}
            {mode === 'edit'
                ? <TextField source="provider" />
                : <SelectInput
                    source="provider"
                    fullWidth
                    validate={required()} choices={[
                        { id: 'bearer', name: 'Bearer' },
                        { id: 'local', name: 'Local' },
                        { id: 'openid', name: 'OpenID' },
                    ]}
                    disabled={permissions?.input.disabled}
                />}
            <SelectInput
                source="role"
                fullWidth
                validate={required()}
                choices={[
                    { id: 'admin', name: 'Admin' },
                    { id: 'readonly', name: 'Readonly' },
                ]}
                disabled={permissions?.input.disabled}
            />
            <TextInput source="secret" fullWidth disabled={permissions?.input.disabled} />
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
