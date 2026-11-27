import { useMediaQuery, type Theme } from '@mui/material';
import { DataTable, List, SimpleList } from 'react-admin';

import { Empty, ProtectedEditButton } from '../components';

export function AuthEntityList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

    return (
        <List empty={<Empty />} exporter={false} pagination={false}>
            {isSmall ? (
                <SimpleList primaryText={(record) => record.identifier} secondaryText={(record) => record.provider} />
            ) : (
                <DataTable rowClick="show">
                    <DataTable.Col source="identifier" />
                    <DataTable.Col source="provider" />
                    <DataTable.Col source="role" />
                    <DataTable.Col>
                        <ProtectedEditButton />
                    </DataTable.Col>
                </DataTable>
            )}
        </List>
    );
}
