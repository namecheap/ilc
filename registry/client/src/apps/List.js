import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '@material-ui/core';
import { Datagrid, List, SimpleList, TextField, ChipField, ReferenceField, EditButton } from 'react-admin'; // eslint-disable-line import/no-unresolved
import { Empty, ListBulkActions, ListActionsToolbar } from '../components';
import { ListFilter } from './ListFilter';
import dataProvider from '../dataProvider';

const PostList = (props) => {
    const { permissions } = props;

    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    const [routerDomain, setRouterDomain] = useState([]);

    useEffect(() => {
        dataProvider.getList('router_domains', { pagination: false, sort: false, filter: false }).then(({ data }) => {
            if (!data.length) {
                return;
            }

            setRouterDomain([
                {
                    id: 'null',
                    domainName: 'Non-specified',
                },
                ...data,
            ]);
        });
    }, []);

    return (
        <List
            {...props}
            bulkActionButtons={permissions === 'readonly' ? false : <ListBulkActions />}
            exporter={false}
            perPage={25}
            actions={permissions === 'readonly' ? false : undefined}
            filters={<ListFilter routerDomain={routerDomain} />}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList primaryText={(record) => record.name} secondaryText={(record) => record.kind} />
            ) : (
                <Datagrid rowClick="show" optimized>
                    <TextField source="name" />
                    <TextField source="kind" />
                    <ReferenceField source="configSelector" reference="shared_props" emptyText="-" sortable={false}>
                        <ChipField source="name" />
                    </ReferenceField>
                    <ReferenceField source="enforceDomain" reference="router_domains" emptyText="-" sortable={false}>
                        <TextField source="domainName" />
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
