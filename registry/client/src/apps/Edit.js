import React, {Fragment} from 'react';
import {
    Create,
    Edit,
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
import { APP_KINDS_WITH_WRAPPER } from '../constants';

const selectHasAssetsDiscoveryUrl = (formData) => formData.assetsDiscoveryUrl && formData.assetsDiscoveryUrl.length !== 0;
const selectWarnMessageDueToAssetsDiscoveryUrl = (formData) => {
    if (!selectHasAssetsDiscoveryUrl(formData)) {
        return '';
    }

    return `Do not need to specify SPA bundle, CSS bundle, dependencies because they would be fetched and set from assets discovery URL if they exist there`;
};

/**
 * Need to validate 'assetsDiscoveryUrl', 'spaBundle' here because they both depend on each other
 */
const validateApp = (values) => {
    const errors = {};

    if (values.assetsDiscoveryUrl) {
        errors.assetsDiscoveryUrl = validators.url(values.assetsDiscoveryUrl);
    } else {
        errors.spaBundle = values.spaBundle ? validators.url(values.spaBundle) : validators.required(values.spaBundle);
    }

    return errors;
};

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <TabbedForm initialValues={{ dependencies: [] }} {...props}>
            <FormTab label="Summary">
                {mode === 'edit'
                    ? <TextField source="name" />
                    : <TextInput source="name" fullWidth validate={validators.required} />}
                <SelectInput
                    source="kind"
                    choices={APP_KINDS_WITH_WRAPPER}
                    validate={validators.required}
                />
                <ReferenceInput source="enforceDomain" reference="router_domains">
                    <SelectInput resettable optionText="domainName" />
                </ReferenceInput>
                <FormDataConsumer>
                    {({ formData, ...rest }) => formData.kind !== 'wrapper' &&
                        <ReferenceInput
                            reference="app"
                            source="wrappedWith"
                            label="Wrapped with"
                            filter={{kind: 'wrapper'}}
                            allowEmpty {...rest}
                        >
                            <SelectInput optionText="name" />
                        </ReferenceInput>
                    }
                </FormDataConsumer>
                <JsonField
                    source="discoveryMetadata"
                    label="Discovery metadata (can be used to retrieve apps filtered by some metadata fields)."
                />
                <TextInput
                    fullWidth
                    multiline
                    source="adminNotes"
                    label="Admin notes (store here some information about the app, e.g. link to git repository, names of the app owners etc)."
                />
            </FormTab>
            <FormTab label="Assets">
                <FormDataConsumer>
                    {({formData}) => {
                        const hasAssetsDiscoveryUrl = selectHasAssetsDiscoveryUrl(formData);
                        const assetsDiscoveryUrlWarningText = selectWarnMessageDueToAssetsDiscoveryUrl(formData);

                        return (
                            <Fragment>
                                <TextInput fullWidth resettable type="url" source="assetsDiscoveryUrl" helperText={assetsDiscoveryUrlWarningText} />
                                <TextInput fullWidth resettable type="url" source="spaBundle" disabled={hasAssetsDiscoveryUrl} />
                                <TextInput fullWidth resettable type="url" source="cssBundle" validate={validators.url} />
                                <ArrayInput source="dependencies">
                                    <SimpleFormIterator>
                                        <TextInput fullWidth label="Name" source="key" validate={validators.required} />
                                        <TextInput fullWidth label="URL" type="url" source="value" validate={[validators.required, validators.url]} />
                                    </SimpleFormIterator>
                                </ArrayInput>
                            </Fragment>
                        );
                    }}
                </FormDataConsumer>
            </FormTab>
            <FormTab label="SSR">
                <TextInput source="ssr.src" label="URL" type="url" validate={validators.url} fullWidth />
                <NumberInput source="ssr.timeout" label="Request timeout, in ms" />
            </FormTab>
            <FormTab label="Props">
                <ReferenceArrayInput reference="shared_props" source="configSelector" label="Shared props selector">
                    <AutocompleteArrayInput />
                </ReferenceArrayInput>
                <JsonField source="props" label="Properties that will be passed to application" />
                <JsonField source="ssrProps" label="Properties that will be added to main props at SSR request, allow to override certain values" />
            </FormTab>
        </TabbedForm>
    );
};

export const MyEdit = ({ permissions, ...props }) => {
    return (
        <Edit title={<Title />} undoable={false} {...props}>
            <InputForm mode="edit" validate={validateApp} />
        </Edit>
    );
};

export const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <InputForm mode="create" validate={validateApp} />
        </Create>
    );
};
