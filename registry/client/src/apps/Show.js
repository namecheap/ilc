import React, { Fragment } from 'react';
import {
    Show,
    FormTab,
    SelectInput,
    TabbedForm,
    TextInput,
    ArrayInput,
    SimpleFormIterator,
    FormDataConsumer,
    NumberInput,
    TextField,
    ReferenceArrayInput,
    ReferenceInput,
    AutocompleteArrayInput,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

import JsonField from '../JsonField/index';
import * as validators from '../validators';
import Title from './Title';
import { JSON_FIELD_VIEW_MODE } from '../constants';
import { ShowTopToolbar } from '../components';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    return (
        <Show {...props} title={<Title />} actions={<ShowTopToolbar />}>
            <TabbedForm initialValues={{ dependencies: [] }} {...props} toolbar={null}>
                <FormTab label="Summary">
                    <TextField source="name" />
                    <SelectInput
                        source="kind"
                        choices={[
                            { id: 'primary', name: 'Primary' },
                            { id: 'essential', name: 'Essential' },
                            { id: 'regular', name: 'Regular' },
                            { id: 'wrapper', name: 'Wrapper' },
                        ]}
                        validate={validators.required}
                        disabled={true}
                    />
                    <FormDataConsumer>
                        {({ formData, ...rest }) => formData.kind !== 'wrapper' &&
                            <ReferenceInput
                                reference="app"
                                source="wrappedWith"
                                label="Wrapped with"
                                filter={{ kind: 'wrapper' }}
                                allowEmpty {...rest}
                                disabled={true}
                            >
                                <SelectInput optionText="name" />
                            </ReferenceInput>
                        }
                    </FormDataConsumer>
                    <JsonField
                        source="discoveryMetadata"
                        label="Discovery metadata (can be used to retrieve apps filtered by some metadata fields)."
                        mode={JSON_FIELD_VIEW_MODE}
                    />
                    <TextInput
                        fullWidth
                        multiline
                        source="adminNotes"
                        label="Admin notes (store here some information about the app, e.g. link to git repository, names of the app owners etc)."
                        disabled={true}
                    />
                </FormTab>
                <FormTab label="Assets">
                    <FormDataConsumer>
                        {({ formData }) => {
                            return (
                                <Fragment>
                                    <TextInput fullWidth resettable type="url" source="assetsDiscoveryUrl" disabled={true} />
                                    <TextInput fullWidth resettable type="url" source="spaBundle" disabled={true} />
                                    <TextInput fullWidth resettable type="url" source="cssBundle" validate={validators.url} disabled={true} />
                                    <ArrayInput source="dependencies">
                                        <SimpleFormIterator disableRemove={true} disableAdd={true}>
                                            <TextInput fullWidth label="Name" source="key" validate={validators.required} disabled={true} />
                                            <TextInput fullWidth label="URL" type="url" source="value" validate={[validators.required, validators.url]} disabled={true} />
                                        </SimpleFormIterator>
                                    </ArrayInput>
                                </Fragment>
                            );
                        }}
                    </FormDataConsumer>
                </FormTab>
                <FormTab label="SSR">
                    <TextInput source="ssr.src" label="URL" type="url" validate={validators.url} fullWidth disabled={true} />
                    <NumberInput source="ssr.timeout" label="Request timeout, in ms" disabled={true} />
                </FormTab>
                <FormTab label="Props">
                    <ReferenceArrayInput reference="shared_props" source="configSelector" label="Shared props selector" disabled={true}>
                        <AutocompleteArrayInput />
                    </ReferenceArrayInput>
                    <JsonField
                        mode={JSON_FIELD_VIEW_MODE}
                        source="props"
                        label="Properties that will be passed to application"
                    />
                    <JsonField
                        mode={JSON_FIELD_VIEW_MODE}
                        source="ssrProps"
                        label="Properties that will be added to main props at SSR request, allow to override certain values"
                    />
                </FormTab>
            </TabbedForm>
        </Show>
    );
};
