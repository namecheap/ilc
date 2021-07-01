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
    usePermissions,
} from 'react-admin'; // eslint-disable-line import/no-unresolved

import JsonField from '../JsonField/index';
import * as validators from '../validators';
import { CustomBottomToolbar } from '../components';

const Title = ({record}) => {
    return (<span>{record ? `App "${record.name}"` : ''}</span>);
};

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
    const { permissions } = usePermissions();

    return (
        <TabbedForm initialValues={{ dependencies: [] }} {...props} toolbar={<CustomBottomToolbar />}>
            <FormTab label="Summary">
                {mode === 'edit'
                    ? <TextField source="name" />
                    : <TextInput source="name" fullWidth validate={validators.required} disabled={permissions?.input.disabled} />}
                <SelectInput
                    source="kind"
                    choices={[
                        {id: 'primary', name: 'Primary'},
                        {id: 'essential', name: 'Essential'},
                        {id: 'regular', name: 'Regular'},
                        {id: 'wrapper', name: 'Wrapper'},
                    ]}
                    validate={validators.required}
                    disabled={permissions?.input.disabled}
                />
                <FormDataConsumer>
                    {({ formData, ...rest }) => formData.kind !== 'wrapper' &&
                        <ReferenceInput
                            reference="app"
                            source="wrappedWith"
                            label="Wrapped with"
                            filter={{kind: 'wrapper'}}
                            allowEmpty {...rest}
                            disabled={permissions?.input.disabled}
                        >
                            <SelectInput optionText="name" />
                        </ReferenceInput>
                    }
                </FormDataConsumer>
                <JsonField
                    source="discoveryMetadata"
                    label="Discovery metadata (can be used to retrieve apps filtered by some metadata fields)."
                    mode={permissions?.jsonEditor.mode}
                />
                <TextInput
                    fullWidth
                    multiline
                    source="adminNotes"
                    label="Admin notes (store here some information about the app, e.g. link to git repository, names of the app owners etc)."
                    disabled={permissions?.input.disabled}
                />
            </FormTab>
            <FormTab label="Assets">
                <FormDataConsumer>
                    {({formData}) => {
                        const hasAssetsDiscoveryUrl = selectHasAssetsDiscoveryUrl(formData);
                        const assetsDiscoveryUrlWarningText = selectWarnMessageDueToAssetsDiscoveryUrl(formData);

                        return (
                            <Fragment>
                                <TextInput fullWidth resettable type="url" source="assetsDiscoveryUrl" helperText={assetsDiscoveryUrlWarningText} disabled={permissions?.input.disabled} />
                                <TextInput fullWidth resettable type="url" source="spaBundle" disabled={hasAssetsDiscoveryUrl || permissions?.input.disabled} required={!hasAssetsDiscoveryUrl} />
                                <TextInput fullWidth resettable type="url" source="cssBundle" validate={validators.url} disabled={permissions?.input.disabled} />
                                <ArrayInput source="dependencies">
                                    <SimpleFormIterator disableRemove={permissions?.buttons.hidden} disableAdd={permissions?.buttons.hidden}>
                                        <TextInput fullWidth label="Name" source="key" validate={validators.required} disabled={permissions?.input.disabled} />
                                        <TextInput fullWidth label="URL" type="url" source="value" validate={[validators.required, validators.url]} disabled={permissions?.input.disabled} />
                                    </SimpleFormIterator>
                                </ArrayInput>
                            </Fragment>
                        );
                    }}
                </FormDataConsumer>
            </FormTab>
            <FormTab label="SSR">
                <TextInput source="ssr.src" label="URL" type="url" validate={validators.url} fullWidth disabled={permissions?.input.disabled} />
                <NumberInput source="ssr.timeout" label="Request timeout, in ms" disabled={permissions?.input.disabled} />
            </FormTab>
            <FormTab label="Props">
                <ReferenceArrayInput reference="shared_props" source="configSelector" label="Shared props selector" disabled={permissions?.input.disabled}>
                    <AutocompleteArrayInput />
                </ReferenceArrayInput>
                <JsonField source="props" label="Properties that will be passed to application" mode={permissions?.jsonEditor.mode} />
                <JsonField source="ssrProps" label="Properties that will be added to main props at SSR request, allow to override certain values" mode={permissions?.jsonEditor.mode} />
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
