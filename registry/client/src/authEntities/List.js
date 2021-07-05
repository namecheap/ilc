import React from 'react';
import { useMediaQuery } from '@material-ui/core';
import {
    Datagrid,
    List,
    SimpleList,
    TextField,
    EditButton,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import {
    Empty,
    ListBulkActions,
    ListActionsToolbar,
    RemovePagination,
} from '../components';

const PostList = props => {
    const { permissions } = props;

    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));

    return (
        <List
            {...props}
            bulkActionButtons={permissions === 'readonly' ? false : <ListBulkActions />}
            exporter={false}
            pagination={<RemovePagination />}
            actions={permissions === 'readonly' ? false : undefined}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.identifier}
                    secondaryText={record => record.provider}
                />
            ) : (
                <Datagrid rowClick="show" optimized>
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
