import React from 'react';
import {
    Create,
    Edit,
    SimpleForm,
    TextInput,
    required,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import JsonField from '../JsonField/index';
import Title from './Title';
import { JSON_FIELD_CODE_MODE } from '../constants';

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <SimpleForm initialValues={{ props: {} }} {...props}>
            {mode === 'edit'
                ? <TextField source="name" />
                : <TextInput source="name" fullWidth validate={required()} />}
            <JsonField
                source="props"
                label="Properties that will be passed to applications"
                mode={JSON_FIELD_CODE_MODE}
            />
            <JsonField
                source="ssrProps"
                label="Properties that will be added to main props at SSR request, allow to override certain values"
                mode={JSON_FIELD_CODE_MODE}
            />
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
