import { useMediaQuery, type Theme } from '@mui/material';
import {
    ChipField,
    DataTable,
    List,
    ReferenceArrayField,
    ReferenceField,
    SimpleList,
    SingleFieldList,
    TextField,
} from 'react-admin';

import { Empty, ListTopToolbar, ProtectedEditButton } from '../components';
import { useRouterDomainFilterChoices } from '../routerDomains/useRouterDomains';
import { getListFilters } from './ListFilter';

export function AppList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));
    const routerDomains = useRouterDomainFilterChoices();

    return (
        <List
            empty={<Empty />}
            exporter={false}
            perPage={25}
            actions={<ListTopToolbar />}
            filters={getListFilters(routerDomains)}
        >
            {isSmall ? (
                <SimpleList primaryText={(record) => record.name} secondaryText={(record) => record.kind} />
            ) : (
                <DataTable rowClick="show">
                    <DataTable.Col source="name" />
                    <DataTable.Col source="kind" />
                    <DataTable.Col source="configSelector" disableSort>
                        <ReferenceArrayField source="configSelector" reference="shared_props">
                            <SingleFieldList>
                                <ChipField source="name" />
                            </SingleFieldList>
                        </ReferenceArrayField>
                    </DataTable.Col>
                    <DataTable.Col source="enforceDomain" disableSort>
                        <ReferenceField source="enforceDomain" reference="router_domains" emptyText="-">
                            <TextField source="domainName" />
                        </ReferenceField>
                    </DataTable.Col>
                    <DataTable.Col>
                        <ProtectedEditButton />
                    </DataTable.Col>
                </DataTable>
            )}
        </List>
    );
}
