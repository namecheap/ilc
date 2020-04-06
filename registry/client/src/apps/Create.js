import React, { useMemo } from 'react';
import {
    ArrayInput,
    Create,
    NumberInput,
    FormTab,
    SelectInput,
    TabbedForm,
    SimpleFormIterator,
    TextInput,
    required
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import JsonField from "../JsonField/index";

const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <TabbedForm initialValues={{ dependencies: [] }}>
                <FormTab label="Summary">
                    <TextInput source="name" fullWidth validate={required()} />
                    <SelectInput source="kind" validate={required()} choices={[
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
        </Create>
    );
};

export default MyCreate;
