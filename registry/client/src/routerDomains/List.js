import React from 'react';
import { useMediaQuery } from '@material-ui/core';
import { Datagrid, List, SimpleList, TextField, ReferenceField, EditButton } from 'react-admin';
import { Empty, ListBulkActions, ListActionsToolbar } from '../components';

const PostList = (props) => {
    const { permissions } = props;

    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    return (
        <List
            {...props}
            bulkActionButtons={permissions === 'readonly' ? false : <ListBulkActions />}
            exporter={false}
            perPage={10}
            actions={permissions === 'readonly' ? false : undefined}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList primaryText={(record) => record.id} secondaryText={(record) => record.domainName} />
            ) : (
                <Datagrid rowClick="show" optimized>
                    <TextField source="id" sortable={false} />
                    <TextField source="domainName" sortable={false} />
                    <ReferenceField
                        label="Template 500"
                        source="template500"
                        reference="template"
                        emptyText="-"
                        sortable={false}
                    >
                        <TextField source="name" />
                    </ReferenceField>
                    <TextField source="canonicalDomain" sortable={false} emptyText="-" label="Canonical Domain" />
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
