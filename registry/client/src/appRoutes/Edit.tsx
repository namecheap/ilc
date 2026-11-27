import {
    ArrayInput,
    AutocompleteInput,
    BooleanInput,
    Create,
    Edit,
    Labeled,
    NumberInput,
    ReferenceInput,
    SelectInput,
    SimpleFormIterator,
    TabbedForm,
    TextField,
    TextInput,
    required,
    useRecordContext,
    type RaRecord,
} from 'react-admin';
import { useLocation } from 'react-router-dom';

import { APP_KINDS, SPECIAL_ROLES } from '../constants';
import { JsonField } from '../JsonField';
import { useRouterDomains } from '../routerDomains/useRouterDomains';
import { Title } from './Title';

const DOMAIN_HELP =
    'If you choose domain then you current route will be used only with this domain, otherwise it will be used for any domain except those which are added to "Router domains" list.';

/** A special route, such as the 404 page, renders a template of its own, so it must have one */
function requiredSpecial(value: unknown, allValues: Partial<RaRecord>) {
    if (!allValues.specialRole) {
        return undefined;
    }

    return required()(value, allValues);
}

function InputForm({ mode }: { mode: 'create' | 'edit' }) {
    const isMultiDomain = useRouterDomains().length > 0;
    const record = useRecordContext();
    const location = useLocation();

    const isCreateSpecial = !!new URLSearchParams(location.search).get('special');
    const isUpdateSpecial = !!record?.specialRole;
    const isSpecial = isCreateSpecial || isUpdateSpecial;

    return (
        <TabbedForm>
            <TabbedForm.Tab label="General">
                {mode === 'edit' ? (
                    <Labeled>
                        <TextField source="id" />
                    </Labeled>
                ) : null}

                {isSpecial ? (
                    <SelectInput
                        id="specialRole"
                        resettable
                        source="specialRole"
                        label="Special role"
                        validate={[required()]}
                        choices={SPECIAL_ROLES}
                    />
                ) : (
                    <>
                        <TextInput source="route" fullWidth validate={[required()]} />
                        <NumberInput
                            source="orderPos"
                            label="Order position of the route"
                            helperText="Leave blank to place route at the bottom of the list"
                        />
                        <BooleanInput source="next" defaultValue={false} />
                    </>
                )}

                <ReferenceInput reference="template" source="templateName">
                    <SelectInput
                        id="templateName"
                        label="Template name"
                        resettable
                        validate={[requiredSpecial]}
                        optionText="name"
                    />
                </ReferenceInput>
                {isMultiDomain ? (
                    <ReferenceInput reference="router_domains" source="domainId">
                        <SelectInput
                            id="domainId"
                            label="Domain"
                            resettable
                            optionText="domainName"
                            helperText={DOMAIN_HELP}
                        />
                    </ReferenceInput>
                ) : null}
                <JsonField source="meta" label="Metadata" />
                <TextInput source="namespace" label="Namespace" />
            </TabbedForm.Tab>
            <TabbedForm.Tab label="Slots">
                <ArrayInput source="slots">
                    <SimpleFormIterator>
                        <TextInput source="key" label="Slot name" validate={[required()]} fullWidth />
                        <ReferenceInput
                            reference="app"
                            filter={{ kind: APP_KINDS.map((kind) => kind.id) }}
                            source="appName"
                        >
                            <AutocompleteInput label="App name" optionText="name" validate={[required()]} />
                        </ReferenceInput>
                        <SelectInput resettable source="kind" label="App type" choices={APP_KINDS} />
                        <JsonField
                            source="props"
                            label="Properties that will be passed to application at current route"
                        />
                    </SimpleFormIterator>
                </ArrayInput>
            </TabbedForm.Tab>
        </TabbedForm>
    );
}

export function AppRouteEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <InputForm mode="edit" />
        </Edit>
    );
}

export function AppRouteCreate() {
    return (
        <Create>
            <InputForm mode="create" />
        </Create>
    );
}
