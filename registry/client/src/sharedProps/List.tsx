import { useMediaQuery, type Theme } from '@mui/material';
import { DataTable, List, SimpleList } from 'react-admin';

import { Empty, ProtectedEditButton } from '../components';

export function SharedPropsList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

    return (
        <List empty={<Empty />} exporter={false} pagination={false}>
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
