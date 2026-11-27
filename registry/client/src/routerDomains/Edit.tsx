import {
    Create,
    Edit,
    Labeled,
    ReferenceInput,
    SelectInput,
    TabbedForm,
    TextField,
    TextInput,
    required,
} from 'react-admin';

import { JsonField } from '../JsonField';
import { Title } from './Title';

function InputForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
        <TabbedForm>
            <TabbedForm.Tab label="General">
                {mode === 'edit' ? (
                    <Labeled>
                        <TextField source="id" />
                    </Labeled>
                ) : null}

                <TextInput source="domainName" fullWidth validate={required()} />
                <ReferenceInput reference="template" source="template500">
                    <SelectInput
                        id="template500"
                        label="Template of 500 error"
                        resettable
                        optionText="name"
                        validate={required()}
                    />
                </ReferenceInput>
                <TextInput source="canonicalDomain" label="Canonical Domain" fullWidth />
                <TextInput source="alias" label="Alias" fullWidth />
            </TabbedForm.Tab>

            <TabbedForm.Tab label="Domain Props">
                <JsonField
                    source="props"
                    label="Client Props"
                    helperText="Properties available in browser (e.g., API URLs, CDN URLs, feature flags)"
                />
                <JsonField
                    source="ssrProps"
                    label="SSR Props"
                    helperText="Server-side only properties (e.g., internal API URLs, secrets)"
                />
            </TabbedForm.Tab>
        </TabbedForm>
    );
}

export function RouterDomainEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <InputForm mode="edit" />
        </Edit>
    );
}

export function RouterDomainCreate() {
    return (
        <Create>
            <InputForm mode="create" />
        </Create>
    );
}
