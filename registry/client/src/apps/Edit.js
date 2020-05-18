import React from 'react';
import {
    Create,
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
    ReferenceArrayInput,
    AutocompleteArrayInput
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import JsonField from '../JsonField/index';

const Title = ({ record }) => {
    return (<span>{record ? `App "${record.name}"` : ''}</span>);
};

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <TabbedForm initialValues={{ dependencies: [] }} {...props}>
            <FormTab label="Summary">
                {mode === 'edit'
                    ? <TextField source="name" />
                    : <TextInput source="name" fullWidth validate={required()} />}
                <SelectInput source="kind" choices={[
                    { id: 'primary', name: 'Primary' },
                    { id: 'essential', name: 'Essential' },
                    { id: 'regular', name: 'Regular' },
                ]} />
                <TextInput source="assetsDiscoveryUrl" fullWidth />
                <ReferenceArrayInput reference="shared_props"
                                     source="configSelector"
                                     label="Shared props selector">
                    <AutocompleteArrayInput />
                </ReferenceArrayInput>
            </FormTab>
            <FormTab label="Assets">
                <TextInput source="spaBundle" validate={required()} fullWidth />
                <TextInput source="cssBundle" fullWidth />
                <ArrayInput source="dependencies">
                    <SimpleFormIterator>
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
                <JsonField source="props" label="Properties that will be passed to application"/>
            </FormTab>
        </TabbedForm>
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
