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
} from '../components';

const PostList = props => {
    const { permissions } = props;

    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));

    return (
        <List
            {...props}
            bulkActionButtons={permissions === 'readonly' ? false : <ListBulkActions />}
            exporter={false}
            perPage={25}
            actions={permissions === 'readonly' ? false : undefined}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.name}
                    secondaryText={record => record.spaBundle}
                />
            ) : (
                <Datagrid rowClick="show" optimized>
                    <TextField source="name" />
                    <TextField source="spaBundle" />
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
