import React, { useState, useEffect } from 'react';
import {
    Show,
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
    FormDataConsumer,
} from 'react-admin';
import JsonField from "../JsonField"; // eslint-disable-line import/no-unresolved
import Help from "../components/Help";
import Localization from "../Localization";
import dataProvider from '../dataProvider';
import Title from './Title';
import { JSON_FIELD_VIEW_MODE } from '../constants';
import { ShowTopToolbar } from '../components';

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

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
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

    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <TabbedForm {...props} toolbar={null}>
                <FormTab label="General">
                    <TextField source="id" />
                    
                    <FormDataConsumer>
                        {({ formData }) => {
                            if (formData.specialRole) {
                                return <SelectInput resettable source="specialRole" label="Special role" validate={[required()]} choices={allowedSpecialRoles} disabled={true} />;
                            } else {
                                return (
                                    <>
                                        <TextInput source="route" fullWidth validate={[required()]} disabled={true} />
                                        <NumberInput source="orderPos" label="Order position of the route" helperText="Leave blank to place route at the bottom of the list" disabled={true} />
                                        <BooleanInput source="next" defaultValue={false} disabled={true} />
                                    </>
                                );
                            }
                        }}
                    </FormDataConsumer>

                    <ReferenceInput reference="template"
                        source="templateName"
                        label="Template name">
                        <SelectInput resettable validate={[requiredSpecial]} optionText="name" disabled={true} />
                    </ReferenceInput>
                    {isMultiDomain
                        ? <Help title={Localization.routes.domainHelp}>
                            <ReferenceInput reference="router_domains"
                                source="domainId"
                                label="Domain">
                                <SelectInput resettable optionText="domainName" disabled={true} />
                            </ReferenceInput>
                        </Help>
                        : null}
                    <JsonField source="meta" label="Metadata" />
                </FormTab>
                <FormTab label="Slots">
                    <ArrayInput source="slots">
                        <SimpleFormIterator disableRemove={true} disableAdd={true}>
                            <TextInput source="key" label="Slot name" validate={[required()]} fullWidth disabled={true} />
                            <ReferenceInput reference="app"
                                filter={{ kind: allowedAppKinds.map(v => v.id) }}
                                source="appName"
                                label="App name"
                                disabled={true}>
                                <AutocompleteInput optionValue="name" validate={[required()]} />
                            </ReferenceInput>
                            <SelectInput resettable source="kind" label="App type" choices={allowedAppKinds} disabled={true} />
                            <JsonField source="props" label="Properties that will be passed to application at current route" mode={JSON_FIELD_VIEW_MODE} />
                        </SimpleFormIterator>
                    </ArrayInput>
                </FormTab>
            </TabbedForm>
        </Show>
    );
};
