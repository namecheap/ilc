import React from 'react';
import { useMediaQuery } from '@material-ui/core';
import {
    List,
    Datagrid,
    BooleanField,
    SimpleList,
    SelectField,
    TextField,
    FunctionField,
    EditButton,
} from 'react-admin';
import {
    ListActionsToolbar,
} from '../components';

import {types} from './dataTransform';

const SourceValueField = (props) => {
    const secret = '********';

    if (props.record.secret) {
        return secret;
    }

    switch (props.record.meta.type) {
        case types.choices: {
            return (<SelectField {...props} choices={props.record.meta.choices} />);
        }
        case types.boolean: {
            return (<BooleanField {...props} />);
        }
        case types.password: {
            return secret;
        }
        case types.stringArray: {
            return (<FunctionField {...props} render={v => v[props.source].join(', ')} />);
        }
        default: {
            return (<TextField {...props} />);
        }
    }
}

const PostList = props => {
    const { permissions } = props;

    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));

    return (
        <List
            {...props}
            exporter={false}
            bulkActionButtons={false}
            perPage={25}
        >
            {isSmall
                ? (
                    <SimpleList
                        primaryText={record => record.key}
                        secondaryText={record => record.value}
                    />
                ) : (
                    <Datagrid rowClick={permissions === 'readonly' ? undefined : 'edit'} optimized>
                        <TextField source="key" />
                        <SourceValueField source="value" />
                        <TextField source="scope" />
                        <BooleanField source="secret" />
                        <ListActionsToolbar>
                            <EditButton />
                        </ListActionsToolbar>
                    </Datagrid>
                )}
        </List>
    );
};

export default PostList;
