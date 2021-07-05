import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import queryString from 'query-string';
import {
    Create,
    Edit,
    TabbedForm,
    FormTab,
    NumberInput,
    TextInput,
    BooleanInput,
    required,
    TextField,
    ReferenceInput,
    SelectInput,
    ArrayInput,
    SimpleFormIterator,
    AutocompleteInput,
} from 'react-admin';
import JsonField from "../JsonField"; // eslint-disable-line import/no-unresolved
import Help from "../components/Help";
import Localization from "../Localization";
import dataProvider from '../dataProvider';
import Title from './Title';
import { JSON_FIELD_CODE_MODE } from '../constants';

const requiredSpecial = (value, allValues, props) => {
    if (!allValues.specialRole) {
        return undefined;
    }

    return required()(value, allValues);
};

const allowedAppKinds = [
    { id: 'primary', name: 'Primary' },
    { id: 'essential', name: 'Essential' },
    { id: 'regular', name: 'Regular' },
];

const allowedSpecialRoles = [
    { id: '404', name: '404' },
];

const InputForm = ({mode = 'edit', ...props}) => {
    const [isMultiDomain, setIsMultiDomain] = useState(false);

    useEffect(() => {
        dataProvider.getList('router_domains', { pagination: false, sort: false, filter: false })
            .then(({ data }) => {
                if (!data.length) {
                    return;
                }

                setIsMultiDomain(true);
            });
    }, []);

    const location = useLocation();
    const isCreateSpecial = !!queryString.parse(location.search).special;
    const isUpdateSpecial = !!props.record.specialRole;
    const isSpecial = isCreateSpecial || isUpdateSpecial;

    return (
        <TabbedForm {...props}>
            <FormTab label="General">
                {mode === 'edit'
                    ? <TextField source="id" />
                    : null}

                {isSpecial
                    ? <SelectInput resettable source="specialRole" label="Special role" validate={[required()]} choices={allowedSpecialRoles} />
                    : <>
                        <TextInput source="route" fullWidth validate={[required()]} />
                        <NumberInput source="orderPos" label="Order position of the route" helperText="Leave blank to place route at the bottom of the list" />
                        <BooleanInput source="next" defaultValue={false} />
                    </>}

                <ReferenceInput reference="template"
                                source="templateName"
                                label="Template name">
                    <SelectInput resettable validate={[requiredSpecial]} optionText="name" />
                </ReferenceInput>
                { isMultiDomain
                    ? <Help title={Localization.routes.domainHelp}>
                        <ReferenceInput reference="router_domains"
                            source="domainId"
                            label="Domain">
                            <SelectInput resettable optionText="domainName" />
                        </ReferenceInput>
                    </Help>
                    : null}
                <JsonField source="meta" label="Metadata" mode={JSON_FIELD_CODE_MODE} />
            </FormTab>
            <FormTab label="Slots">
                <ArrayInput source="slots">
                    <SimpleFormIterator>
                        <TextInput source="key" label="Slot name" validate={[required()]} fullWidth />
                        <ReferenceInput reference="app"
                                        filter={{kind: allowedAppKinds.map(v => v.id)}}
                                        source="appName"
                                        label="App name">
                            <AutocompleteInput optionValue="name" validate={[required()]} />
                        </ReferenceInput>
                        <SelectInput resettable source="kind" label="App type" choices={allowedAppKinds} />
                        <JsonField source="props" label="Properties that will be passed to application at current route" mode={JSON_FIELD_CODE_MODE} />
                    </SimpleFormIterator>
                </ArrayInput>
            </FormTab>
        </TabbedForm>
    );
};

export const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<Title />} undoable={false} {...props}>
        <InputForm mode="edit"/>
    </Edit>
);
export const MyCreate = ({ permissions, ...props }) => {
    return (
        <Create {...props}>
            <InputForm mode="create"/>
        </Create>
    );
};
