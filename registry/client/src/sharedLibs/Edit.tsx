import { InputAdornment } from '@mui/material';
import {
    Create,
    Edit,
    FormDataConsumer,
    FunctionField,
    Labeled,
    TabbedForm,
    TextInput,
    type RaRecord,
} from 'react-admin';

import { getAssetsDiscoveryHint, hasAssetsDiscoveryUrl, validateSpaBundle } from '../utils/assetsDiscovery';
import * as validators from '../validators';
import { getPrefixedSharedLibName } from './getPrefixedSharedLibName';
import { Title } from './Title';

function validateName(value: unknown, values: Partial<RaRecord>) {
    return value ? validators.disallowedWhiteSpaces(value) : validators.required(value, values);
}

function InputForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
        <TabbedForm>
            <TabbedForm.Tab label="Summary">
                {mode === 'edit' ? (
                    <Labeled>
                        <FunctionField label="Name" render={(record) => getPrefixedSharedLibName(record.name)} />
                    </Labeled>
                ) : (
                    <TextInput
                        source="name"
                        fullWidth
                        validate={validateName}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start">@sharedLibrary/</InputAdornment>,
                            },
                        }}
                    />
                )}
                <TextInput
                    fullWidth
                    multiline
                    source="adminNotes"
                    label="Admin notes (store here some information about the shared library, e.g. link to git repository, names of the shared library owners etc)."
                />
            </TabbedForm.Tab>
            <TabbedForm.Tab label="Assets">
                <FormDataConsumer>
                    {({ formData }) => (
                        <>
                            <TextInput
                                fullWidth
                                resettable
                                type="url"
                                source="assetsDiscoveryUrl"
                                validate={validators.url}
                                helperText={getAssetsDiscoveryHint(formData, 'SPA bundle')}
                            />
                            <TextInput
                                fullWidth
                                resettable
                                type="url"
                                source="spaBundle"
                                validate={validateSpaBundle}
                                disabled={hasAssetsDiscoveryUrl(formData)}
                            />
                            <TextInput
                                fullWidth
                                resettable
                                type="url"
                                source="l10nManifest"
                                validate={validators.url}
                            />
                        </>
                    )}
                </FormDataConsumer>
            </TabbedForm.Tab>
        </TabbedForm>
    );
}

export function SharedLibEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <InputForm mode="edit" />
        </Edit>
    );
}

export function SharedLibCreate() {
    return (
        <Create>
            <InputForm mode="create" />
        </Create>
    );
}
