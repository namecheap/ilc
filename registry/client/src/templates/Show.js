import React from 'react';
import {
    Show,
    SimpleForm,
    TextInput,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleForm {...props} toolbar={null}>
                <TextField source="name" />
                <TextInput source="content" multiline fullWidth disabled={true} />
            </SimpleForm>
        </Show>
    );
};