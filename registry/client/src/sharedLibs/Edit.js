import React, {Fragment} from 'react';
import {
    Create,
    Edit,
    FormTab,
    TabbedForm,
    TextInput,
    FormDataConsumer,
    FunctionField,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import { Typography } from '@material-ui/core';

import * as validators from '../validators';
import Title from './Title';

const selectHasAssetsDiscoveryUrl = (formData) => formData.assetsDiscoveryUrl && formData.assetsDiscoveryUrl.length !== 0;
const selectWarnMessageDueToAssetsDiscoveryUrl = (formData) => {
    if (!selectHasAssetsDiscoveryUrl(formData)) {
        return '';
    }

    return `Do not need to specify SPA bundle because they would be fetched and set from assets discovery URL if they exist there`;
};

/**
 * Need to validate 'assetsDiscoveryUrl', 'spaBundle' here because they both depend on each other
 */
const validateSharedLib = (values) => {
    const errors = {};

    if (!values.name) {
        errors.name = validators.required(values.name);
    } else {
        errors.name = validators.disallowedWhiteSpaces(values.name);
    }

    if (values.assetsDiscoveryUrl) {
        errors.assetsDiscoveryUrl = validators.url(values.assetsDiscoveryUrl);
    } else {
        errors.spaBundle = values.spaBundle ? validators.url(values.spaBundle) : validators.required(values.spaBundle);
    }

    return errors;
};

const styles = {
    row: {
        display: 'flex',
        width: '100%',
        alignItems: 'center',
    },
};

const InputForm = ({mode = 'edit', ...props}) => {
    return (
        <TabbedForm {...props}>
            <FormTab label="Summary">
                {mode === 'edit'
                    ? <FunctionField
                        label="Name"
                        render={record => `@sharedLibrary/${record.name}`}
                    />
                    : <div style={styles.row}>
                        <Typography variant="body1">@sharedLibrary/</Typography>
                        <TextInput source="name" fullWidth />
                    </div>
                }
                <TextInput
                    fullWidth
                    multiline
                    source="adminNotes"
                    label="Admin notes (store here some information about the shared library, e.g. link to git repository, names of the shared library owners etc)."
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
                                <TextInput fullWidth resettable type="url" source="l10nManifest" validate={validators.url} />
                            </Fragment>
                        );
                    }}
                </FormDataConsumer>
            </FormTab>
        </TabbedForm>
    );
};

export const MyEdit = ({ permissions, ...props }) => {
    return (
        <Edit title={<Title />} undoable={false} {...props}>
            <InputForm mode="edit" validate={validateSharedLib} />
        </Edit>
    );
};

export const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <InputForm mode="create" validate={validateSharedLib} />
        </Create>
    );
};
