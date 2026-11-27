import { Create, Edit, Labeled, SimpleForm, TextField, TextInput, required } from 'react-admin';

import { JsonField } from '../JsonField';
import { Title } from './Title';

function InputForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
        <SimpleForm defaultValues={{ props: {} }}>
            {mode === 'edit' ? (
                <Labeled>
                    <TextField source="name" />
                </Labeled>
            ) : (
                <TextInput source="name" fullWidth validate={required()} />
            )}
            <JsonField source="props" label="Properties that will be passed to applications" />
            <JsonField
                source="ssrProps"
                label="Properties that will be added to main props at SSR request, allow to override certain values"
            />
        </SimpleForm>
    );
}

export function SharedPropsEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <InputForm mode="edit" />
        </Edit>
    );
}

export function SharedPropsCreate() {
    return (
        <Create>
            <InputForm mode="create" />
        </Create>
    );
}
