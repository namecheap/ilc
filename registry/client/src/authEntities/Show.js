import React from 'react';
import {
    Show,
    SimpleForm,
    SelectInput,
    TextInput,
    required,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleForm {...props} toolbar={null}>
                <TextField source="identifier" />
                <TextField source="provider" />
                <SelectInput
                    source="role"
                    fullWidth
                    validate={required()}
                    choices={[
                        { id: 'admin', name: 'Admin' },
                        { id: 'readonly', name: 'Readonly' },
                    ]}
                    disabled={true}
                />
                <TextInput source="secret" fullWidth disabled={true} />
            </SimpleForm>
        </Show>
    );
};
