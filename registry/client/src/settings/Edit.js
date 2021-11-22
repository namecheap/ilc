import React from 'react';
import {
    Edit,
    SimpleForm,
    ArrayInput,
    SimpleFormIterator,
    TextInput,
    RadioButtonGroupInput,
    BooleanInput,
    PasswordInput,
    Toolbar,
    SaveButton,
} from 'react-admin';

import * as validators from '../validators';
import { types } from './dataTransform';
import Title from './Title';

const MyToolbar = (props) => {
    return (
        <Toolbar {...props}>
            <SaveButton />
        </Toolbar>
    );
};

const Input = (props) => {
    switch(props.record.meta.type) {
        case types.url: {
            return (<TextInput source="value" fullWidth={true} validate={validators.url} />);
        }
        case types.enum: {
            return (<RadioButtonGroupInput row={false} source="value" choices={props.record.meta.choices} />);
        }
        case types.boolean: {
            return (<BooleanInput source="value" />);
        }
        case types.password: {
            return (<PasswordInput source="value" fullWidth={true} />);
        }
        case types.stringArray: {
            return (
                <ArrayInput source="value">
                    <SimpleFormIterator>
                        <TextInput fullWidth={true} />
                    </SimpleFormIterator>
                </ArrayInput>
            );
        }
        default: {
            return (<TextInput multiline source="value" fullWidth={true} />);
        }
    }
};

const MyEdit = (props) => {
    return (
        <Edit title={<Title />} undoable={false} {...props}>
            <SimpleForm toolbar={<MyToolbar />}>
                <Input />
            </SimpleForm>
        </Edit>
    );
};

export default MyEdit;
