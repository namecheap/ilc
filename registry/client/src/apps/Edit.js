import React from 'react';
import {
    TopToolbar,
    ArrayInput,
    BooleanInput,
    DateInput,
    Edit,
    CloneButton,
    ShowButton,
    FormTab,
    SelectInput,
    TabbedForm,
    TextInput,
    required,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import { JsonEditor as Editor } from 'jsoneditor-react';
import PostTitle from './Title';


const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<PostTitle />}  {...props}>
        <TabbedForm initialValues={{  }}>
            <FormTab label="Summary">
                <TextInput disabled source="id" />
                <TextInput source="name" validate={required()} resettable />
                <SelectInput source="kind" choices={[
                    { id: 'primary', name: 'Primary' },
                    { id: 'essential', name: 'Essential' },
                    { id: 'regular', name: 'Regular' },
                ]} />

            </FormTab>
            <FormTab label="Body">
                <Editor
                    mode="code"
                    value={({})}
                />
            </FormTab>
        </TabbedForm>
    </Edit>
);

export default MyEdit;
