import React from 'react';
import {
    Edit,
    SimpleForm,
    TextInput,
    RadioButtonGroupInput,
    BooleanInput,
    PasswordInput,
    Toolbar,
    SaveButton,
} from 'react-admin';

import * as validators from '../validators';
import {types} from './dataTransform';

const Title = (props) => {
    return (<span>{props.record ? `Setting "${props.record.key}"` : ''}</span>);
};

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
            return (<TextInput source="value" validate={validators.url} />);
        }
        case types.enum: {
            return (<RadioButtonGroupInput row={false} source="value" choices={props.record.meta.choices} />);
        }
        case types.boolean: {
            return (<BooleanInput source="value" />);
        }
        case types.password: {
            return (<PasswordInput source="value" />);
        }
        default: {
            return (<TextInput source="value" />);
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
