import { useMediaQuery, type Theme } from '@mui/material';
import { DataTable, List, SimpleList } from 'react-admin';

import { Empty, ListTopToolbar, ProtectedEditButton } from '../components';
import { getPrefixedSharedLibName } from './getPrefixedSharedLibName';
import { listFilters } from './ListFilter';

export function SharedLibList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

    return (
        <List empty={<Empty />} exporter={false} perPage={25} actions={<ListTopToolbar />} filters={listFilters}>
            {isSmall ? (
                <SimpleList
                    primaryText={(record) => getPrefixedSharedLibName(record.name)}
                    secondaryText={(record) => record.spaBundle}
                />
            ) : (
                <DataTable rowClick="show">
                    <DataTable.Col label="Name" render={(record) => getPrefixedSharedLibName(record.name)} />
                    <DataTable.Col source="spaBundle" />
                    <DataTable.Col>
                        <ProtectedEditButton />
                    </DataTable.Col>
                </DataTable>
            )}
        </List>
    );
}
