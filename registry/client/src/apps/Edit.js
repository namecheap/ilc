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
import { JSON_FIELD_CODE_MODE } from '../constants';

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

    const assetsDiscoveryUrlShouldBeUrl = validators.url(values.assetsDiscoveryUrl);
    const spaBundleShouldBeUrl = validators.url(values.spaBundle);
    const spaBundleShouldBeRequired = values.assetsDiscoveryUrl ? undefined : validators.required(values.spaBundle);

    if (assetsDiscoveryUrlShouldBeUrl !== undefined) {
        errors.assetsDiscoveryUrl = [];
        errors.assetsDiscoveryUrl.push(assetsDiscoveryUrlShouldBeUrl);
    }

    if (spaBundleShouldBeUrl !== undefined || spaBundleShouldBeRequired !== undefined) {
        errors.spaBundle = [];
        spaBundleShouldBeUrl && errors.spaBundle.push(spaBundleShouldBeUrl);
        spaBundleShouldBeRequired && errors.spaBundle.push(spaBundleShouldBeRequired);
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
                    choices={[
                        {id: 'primary', name: 'Primary'},
                        {id: 'essential', name: 'Essential'},
                        {id: 'regular', name: 'Regular'},
                        {id: 'wrapper', name: 'Wrapper'},
                    ]}
                    validate={validators.required}
                />
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
                    mode={JSON_FIELD_CODE_MODE}
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
                                <TextInput fullWidth resettable type="url" source="spaBundle" disabled={hasAssetsDiscoveryUrl} required={!hasAssetsDiscoveryUrl} />
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
                <JsonField source="props" label="Properties that will be passed to application" mode={JSON_FIELD_CODE_MODE} />
                <JsonField source="ssrProps" label="Properties that will be added to main props at SSR request, allow to override certain values" mode={JSON_FIELD_CODE_MODE} />
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
