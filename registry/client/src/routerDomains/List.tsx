import { useMediaQuery, type Theme } from '@mui/material';
import { DataTable, List, ReferenceField, SimpleList, TextField } from 'react-admin';

import { Empty, ProtectedEditButton } from '../components';

export function RouterDomainList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

    return (
        <List empty={<Empty />} exporter={false} perPage={10}>
            {isSmall ? (
                <SimpleList primaryText={(record) => record.id} secondaryText={(record) => record.domainName} />
            ) : (
                <DataTable rowClick="show">
                    <DataTable.Col source="id" disableSort />
                    <DataTable.Col source="domainName" disableSort />
                    <DataTable.Col label="Template 500" source="template500" disableSort>
                        <ReferenceField source="template500" reference="template" emptyText="-">
                            <TextField source="name" />
                        </ReferenceField>
                    </DataTable.Col>
                    <DataTable.Col source="canonicalDomain" label="Canonical Domain" disableSort>
                        <TextField source="canonicalDomain" emptyText="-" />
                    </DataTable.Col>
                    <DataTable.Col source="alias" label="Alias" disableSort>
                        <TextField source="alias" emptyText="-" />
                    </DataTable.Col>
                    <DataTable.Col>
                        <ProtectedEditButton />
                    </DataTable.Col>
                </DataTable>
            )}
        </List>
    );
}
