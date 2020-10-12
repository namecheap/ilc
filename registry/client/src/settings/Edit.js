import React from 'react';
import {
    Edit,
    SimpleForm,
    TextInput,
    SelectInput,
    BooleanInput,
} from 'react-admin';

import * as validators from '../validators';
import {choices, keys} from './dataTransform';

const Title = ({record}) => {
    return (<span>{record ? `Setting "${record.key}"` : ''}</span>);
};

const InputForm = (props) => {
    switch(props.record.key) {
        case keys.baseUrl: {
            return (
                <SimpleForm {...props}>
                    <TextInput source="value" validate={validators.url} />
                </SimpleForm>
            );
        }
        case keys.trailingSlash: {
            return (
                <SimpleForm {...props}>
                    <SelectInput source="value" choices={choices[keys.trailingSlash]} />
                </SimpleForm>
            );
        }
        case keys.amdDefineCompatibilityMode:
        case keys.authOpenIdEnabled: {
            return (
                <SimpleForm {...props}>
                    <BooleanInput source="value" />
                </SimpleForm>
            );
        }
        case keys.authOpenIdDiscoveryUrl: {
            return (
                <SimpleForm {...props}>
                    <TextInput source="value" validate={validators.url} />
                </SimpleForm>
            );
        }
        default: {
            return (
                <SimpleForm {...props}>
                    <TextInput source="value" />
                </SimpleForm>
            );
        }
    }
};

const MyEdit = ({permissions, ...props}) => {
    return (
        <Edit title={<Title />} undoable={false} {...props}>
            <InputForm />
        </Edit>
    );
};

export default MyEdit;
