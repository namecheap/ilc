import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '@material-ui/core';
import { Datagrid, List, SimpleList, TextField, EditButton } from 'react-admin';
import { Empty, ListBulkActions, ListActionsToolbar, RemovePagination } from '../components';
import { ListFilter } from './ListFilter';
import dataProvider from '../dataProvider';

const PostList = (props) => {
    const { permissions } = props;

    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    const [routerDomain, setRouterDomain] = useState([]);

    useEffect(() => {
        dataProvider
            .getList('router_domains', {
                pagination: false,
                sort: false,
                filter: false,
            })
            .then(({ data }) => {
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
            pagination={<RemovePagination />}
            actions={permissions === 'readonly' ? false : undefined}
            filters={<ListFilter routerDomain={routerDomain} />}
            empty={<Empty />}
        >
            {isSmall ? (
                <SimpleList primaryText={(record) => record.name} />
            ) : (
                <Datagrid rowClick="show" optimized>
                    <TextField source="name" />
                    <ListActionsToolbar>
                        <EditButton />
                    </ListActionsToolbar>
                </Datagrid>
            )}
        </List>
    );
};

export default PostList;
