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
    SimpleFormIterator,
    TextField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import JsonField from '../JsonField/index';

const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<Title />} undoable={false} {...props}>
        <TabbedForm initialValues={{ dependencies: [] }}>
            <FormTab label="Summary">
                <TextField source="name" />
                <SelectInput source="kind" choices={[
                    { id: 'primary', name: 'Primary' },
                    { id: 'essential', name: 'Essential' },
                    { id: 'regular', name: 'Regular' },
                ]} />
                <TextInput source="assetsDiscoveryUrl" fullWidth />
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
            <FormTab label="Props">
                <JsonField source="props"/>
                <JsonField source="initProps"/>
            </FormTab>
        </TabbedForm>
    </Edit>
);

export default MyEdit;
