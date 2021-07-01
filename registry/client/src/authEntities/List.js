import React from 'react';
import { useMediaQuery } from '@material-ui/core';
import {
    Datagrid,
    List,
    SimpleList,
    TextField,
    usePermissions,
    EditButton,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import {
    Empty,
    PostListBulkActions,
    ListActionsToolbar,
    RemovePagination,
} from '../components';

const PostList = props => {
    const { permissions } = usePermissions();

    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));

    return (
        <List
            {...props}
            bulkActionButtons={permissions?.buttons.hidden ? false : <PostListBulkActions />}
            exporter={false}
            pagination={<RemovePagination />}
            actions={permissions?.buttons.hidden ? false : undefined}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.identifier}
                    secondaryText={record => record.provider}
                />
            ) : (
                <Datagrid rowClick="edit" optimized>
                    <TextField source="identifier" />
                    <TextField source="provider" />
                    <TextField source="role" />
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
