import {
    ArrayInput,
    AutocompleteArrayInput,
    Create,
    Edit,
    FormDataConsumer,
    Labeled,
    NumberInput,
    ReferenceArrayInput,
    ReferenceInput,
    SelectInput,
    SimpleFormIterator,
    TabbedForm,
    TextField,
    TextInput,
} from 'react-admin';

import { APP_KINDS_WITH_WRAPPER } from '../constants';
import { JsonField } from '../JsonField';
import { getAssetsDiscoveryHint, hasAssetsDiscoveryUrl, validateSpaBundle } from '../utils/assetsDiscovery';
import * as validators from '../validators';
import { Title } from './Title';

function InputForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
        <TabbedForm defaultValues={{ dependencies: [] }}>
            <TabbedForm.Tab label="Summary">
                {mode === 'edit' ? (
                    <Labeled>
                        <TextField source="name" />
                    </Labeled>
                ) : (
                    <TextInput source="name" fullWidth validate={validators.required} />
                )}
                <SelectInput id="kind" source="kind" choices={APP_KINDS_WITH_WRAPPER} validate={validators.required} />
                <ReferenceInput source="enforceDomain" reference="router_domains">
                    <SelectInput id="enforceDomain" resettable optionText="domainName" />
                </ReferenceInput>
                <FormDataConsumer>
                    {({ formData }) =>
                        formData.kind !== 'wrapper' && (
                            <ReferenceInput reference="app" source="wrappedWith" filter={{ kind: 'wrapper' }}>
                                <SelectInput id="wrappedWith" label="Wrapped with" optionText="name" />
                            </ReferenceInput>
                        )
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
                <TextInput source="namespace" label="Namespace" />
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
                                helperText={getAssetsDiscoveryHint(formData, 'SPA bundle, CSS bundle, dependencies')}
                            />
                            <TextInput
                                fullWidth
                                resettable
                                type="url"
                                source="spaBundle"
                                validate={validateSpaBundle}
                                disabled={hasAssetsDiscoveryUrl(formData)}
                            />
                            <TextInput fullWidth resettable type="url" source="cssBundle" validate={validators.url} />
                            <TextInput
                                fullWidth
                                resettable
                                type="url"
                                source="l10nManifest"
                                validate={validators.url}
                            />
                            <ArrayInput source="dependencies">
                                <SimpleFormIterator>
                                    <TextInput fullWidth label="Name" source="key" validate={validators.required} />
                                    <TextInput
                                        fullWidth
                                        label="URL"
                                        type="url"
                                        source="value"
                                        validate={[validators.required, validators.url]}
                                    />
                                </SimpleFormIterator>
                            </ArrayInput>
                        </>
                    )}
                </FormDataConsumer>
            </TabbedForm.Tab>
            <TabbedForm.Tab label="SSR">
                <TextInput source="ssr.src" label="URL" type="url" validate={validators.url} fullWidth />
                <NumberInput source="ssr.timeout" label="Request timeout, in ms" />
            </TabbedForm.Tab>
            <TabbedForm.Tab label="Props">
                <ReferenceArrayInput reference="shared_props" source="configSelector">
                    <AutocompleteArrayInput label="Shared props selector" />
                </ReferenceArrayInput>
                <JsonField source="props" label="Properties that will be passed to application" />
                <JsonField
                    source="ssrProps"
                    label="Properties that will be added to main props at SSR request, allow to override certain values"
                />
            </TabbedForm.Tab>
        </TabbedForm>
    );
}

export function AppEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <InputForm mode="edit" />
        </Edit>
    );
}

export function AppCreate() {
    return (
        <Create>
            <InputForm mode="create" />
        </Create>
    );
}
