import { Create, Edit, Labeled, SelectInput, SimpleForm, TextField, TextInput, required } from 'react-admin';

import { Title } from './Title';

const PROVIDERS = [
    { id: 'bearer', name: 'Bearer' },
    { id: 'local', name: 'Local' },
    { id: 'openid', name: 'OpenID' },
];

const ROLES = [
    { id: 'admin', name: 'Admin' },
    { id: 'readonly', name: 'Readonly' },
];

function InputForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
        <SimpleForm>
            {mode === 'edit' ? (
                <Labeled>
                    <TextField source="identifier" />
                </Labeled>
            ) : (
                <TextInput source="identifier" fullWidth validate={required()} />
            )}
            {mode === 'edit' ? (
                <Labeled>
                    <TextField source="provider" />
                </Labeled>
            ) : (
                <SelectInput id="provider" source="provider" fullWidth validate={required()} choices={PROVIDERS} />
            )}
            <SelectInput id="role" source="role" fullWidth validate={required()} choices={ROLES} />
            <TextInput source="secret" fullWidth />
        </SimpleForm>
    );
}

export function AuthEntityEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <InputForm mode="edit" />
        </Edit>
    );
}

export function AuthEntityCreate() {
    return (
        <Create>
            <InputForm mode="create" />
        </Create>
    );
}
