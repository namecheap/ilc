import React from 'react';
import { useMediaQuery } from '@material-ui/core';
import {
    Datagrid,
    List,
    SimpleList,
    TextField,
    ReferenceField,
    usePermissions,
    EditButton,
} from 'react-admin';
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
            perPage={10}
            actions={permissions?.buttons.hidden ? false : undefined}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={record => record.id}
                    secondaryText={record => record.domainName}
                />
            ) : (
                <Datagrid rowClick="edit" optimized>
                    <TextField source="id" sortable={false} />
                    <TextField source="domainName" sortable={false} />
                    <ReferenceField label="Template 500" source="template500" reference="template" emptyText="-" sortable={false}>
                        <TextField source="name" />
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
