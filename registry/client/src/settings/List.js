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
    ReferenceInput,
    SelectInput,
} from 'react-admin';
import { ListActionsToolbar } from '../components';

import { types } from './dataTransform';

const SourceValueField = (props) => {
    const secret = '********';

    if (props.record.secret) {
        return secret;
    }

    if (!props.record.meta) {
        return null;
    }

    switch (props.record.meta.type) {
        case types.choices: {
            return <SelectField {...props} choices={props.record.meta.choices} />;
        }
        case types.boolean: {
            return <BooleanField {...props} />;
        }
        case types.password: {
            return secret;
        }
        case types.stringArray: {
            return <FunctionField {...props} render={(v) => (v[props.source] ? v[props.source].join(', ') : null)} />;
        }
        default: {
            return (
                <div style={{ wordBreak: 'break-all', maxHeight: '400px', overflow: 'auto' }}>
                    <TextField {...props} />
                </div>
            );
        }
    }
};

const MyEditButton = (props) => {
    const { basePath, record } = props;
    const resourcePath = `${basePath}/${record.id}`;
    const redirect = record.domainId ? `${resourcePath}?domainId=${record.domainId}` : resourcePath;

    return !record.domainId ? (
        <EditButton {...props} disabled={record.protected} />
    ) : (
        <EditButton {...props} to={redirect} disabled={record.protected} />
    );
};

const PostList = (props) => {
    const { permissions } = props;

    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    const postFilters = [
        <ReferenceInput alwaysOn source="enforceDomain" reference="router_domains">
            <SelectInput alwaysOn resettable optionText="domainName" />
        </ReferenceInput>,
    ];

    return (
        <List {...props} exporter={false} bulkActionButtons={false} perPage={25} filters={postFilters}>
            {isSmall ? (
                <SimpleList primaryText={(record) => record.key} secondaryText={(record) => record.value} />
            ) : (
                <Datagrid optimized>
                    <TextField source="key" />
                    <SourceValueField source="value" />
                    <TextField source="scope" />
                    <BooleanField source="secret" />
                    <ListActionsToolbar>
                        <MyEditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
