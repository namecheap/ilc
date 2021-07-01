import React from 'react';
import { useMediaQuery } from '@material-ui/core';
import {
    Datagrid,
    List,
    SimpleList,
    TextField,
    ChipField,
    ReferenceField,
    usePermissions,
    EditButton,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import {
    Empty,
    PostListBulkActions,
    ListActionsToolbar,
} from '../components';

const PostList = props => {
    const { permissions } = usePermissions();

    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));
    return (
        <List
            {...props}
            bulkActionButtons={permissions?.buttons.hidden ? false : <PostListBulkActions />}
            exporter={false}
            perPage={25}
            actions={permissions?.buttons.hidden ? false : undefined}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.name}
                    secondaryText={record => record.kind}
                />
            ) : (
                <Datagrid rowClick="edit" optimized>
                    <TextField source="name" />
                    <TextField source="kind" />
                    <ReferenceField source="configSelector" reference="shared_props" emptyText="-" sortable={false}>
                        <ChipField source="name" />
                    </ReferenceField>
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
