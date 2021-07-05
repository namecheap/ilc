import React from 'react';
import {
    Show,
    SimpleForm,
    ArrayInput,
    SimpleFormIterator,
    TextInput,
    RadioButtonGroupInput,
    BooleanInput,
    PasswordInput,
} from 'react-admin';

import * as validators from '../validators';
import { types } from './dataTransform';
import Title from './Title';
import { ShowTopToolbar } from '../components';

const Input = (props) => {
    switch (props.record.meta.type) {
        case types.url: {
            return (<TextInput source="value" fullWidth={true} validate={validators.url} disabled={true} />);
        }
        case types.enum: {
            return (<RadioButtonGroupInput row={false} source="value" choices={props.record.meta.choices} disabled={true} />);
        }
        case types.boolean: {
            return (<BooleanInput source="value" disabled={true} />);
        }
        case types.password: {
            return (<PasswordInput source="value" fullWidth={true} disabled={true} />);
        }
        case types.stringArray: {
            return (
                <ArrayInput source="value">
                    <SimpleFormIterator disableRemove={true} disableAdd={true}>
                        <TextInput fullWidth={true} disabled={true} />
                    </SimpleFormIterator>
                </ArrayInput>
            );
        }
        default: {
            return (<TextInput source="value" fullWidth={true} disabled={true} />);
        }
    }
};

const MyShow = (props) => {
    return (
        <Show title={<Title />} {...props} actions={<ShowTopToolbar />}>
            <SimpleForm toolbar={null}>
                <Input />
            </SimpleForm>
        </Show>
    );
};

export default MyShow;
