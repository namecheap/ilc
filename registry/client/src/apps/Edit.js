import React from 'react';
import {
    Edit,
    FormTab,
    SelectInput,
    TabbedForm,
    TextInput,
    NumberInput,
    required,
    ArrayInput,
    SimpleFormIterator
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import { JsonEditor as Editor } from 'jsoneditor-react';
import Title from './Title';


const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<Title />}  {...props}>
        <TabbedForm initialValues={{ dependencies: [] }}>
            <FormTab label="Summary">
                <TextInput source="name" validate={required()} fullWidth />
                <SelectInput source="kind" choices={[
                    { id: 'primary', name: 'Primary' },
                    { id: 'essential', name: 'Essential' },
                    { id: 'regular', name: 'Regular' },
                ]} />
            </FormTab>
            <FormTab label="Assets">
                <TextInput source="spaBundle" validate={required()} fullWidth />
                <TextInput source="cssBundle" fullWidth />
                <ArrayInput source="dependencies">
                    <SimpleFormIterator >
                        <TextInput source="key" label="Name" fullWidth />
                        <TextInput source="value" label="URL" fullWidth />
                    </SimpleFormIterator>
                </ArrayInput>
            </FormTab>
            <FormTab label="SSR">
                <TextInput source="ssr.src" label="URL" fullWidth />
                <NumberInput source="ssr.timeout" label="Request timeout, in ms" />
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
