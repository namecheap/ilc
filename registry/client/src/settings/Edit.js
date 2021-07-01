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
    usePermissions,
} from 'react-admin';

import * as validators from '../validators';
import { types } from './dataTransform';
import { CustomBottomToolbar } from '../components';

const Title = (props) => {
    return (<span>{props.record ? `Setting "${props.record.key}"` : ''}</span>);
};

const Input = (props) => {
    const { permissions } = usePermissions();

    switch(props.record.meta.type) {
        case types.url: {
            return (<TextInput source="value" fullWidth={true} validate={validators.url} disabled={permissions?.input.disabled} />);
        }
        case types.enum: {
            return (<RadioButtonGroupInput row={false} source="value" choices={props.record.meta.choices} disabled={permissions?.input.disabled} />);
        }
        case types.boolean: {
            return (<BooleanInput source="value" disabled={permissions?.input.disabled} />);
        }
        case types.password: {
            return (<PasswordInput source="value" fullWidth={true} disabled={permissions?.input.disabled} />);
        }
        case types.stringArray: {
            return (
                <ArrayInput source="value">
                    <SimpleFormIterator disableRemove={permissions?.buttons.hidden} disableAdd={permissions?.buttons.hidden}>
                        <TextInput fullWidth={true} disabled={permissions?.input.disabled} />
                    </SimpleFormIterator>
                </ArrayInput>
            );
        }
        default: {
            return (<TextInput source="value" fullWidth={true} disabled={permissions?.input.disabled} />);
        }
    }
};

const MyEdit = (props) => {
    return (
        <Edit title={<Title />} undoable={false} {...props}>
            <SimpleForm toolbar={<CustomBottomToolbar alwaysDisableRemove={true} />}>
                <Input />
            </SimpleForm>
        </Edit>
    );
};

export default MyEdit;
