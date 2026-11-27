import { useMediaQuery, type Theme } from '@mui/material';
import { DataTable, List, SimpleList } from 'react-admin';

import { Empty, ListTopToolbar, ProtectedEditButton } from '../components';
import { useRouterDomainFilterChoices } from '../routerDomains/useRouterDomains';
import { getListFilters } from './ListFilter';

export function TemplateList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));
    const routerDomains = useRouterDomainFilterChoices();

    return (
        <List
            empty={<Empty />}
            exporter={false}
            pagination={false}
            actions={<ListTopToolbar />}
            filters={getListFilters(routerDomains)}
        >
            {isSmall ? (
                <SimpleList primaryText={(record) => record.name} />
            ) : (
                <DataTable rowClick="show">
                    <DataTable.Col source="name" />
                    <DataTable.Col>
                        <ProtectedEditButton />
                    </DataTable.Col>
                </DataTable>
            )}
        </List>
    );
}
