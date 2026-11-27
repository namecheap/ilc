import { useMediaQuery, type Theme } from '@mui/material';
import {
    BooleanField,
    DataTable,
    FunctionField,
    List,
    ReferenceInput,
    SelectInput,
    SimpleList,
    TextField,
    useRecordContext,
    type RaRecord,
} from 'react-admin';

import { ListTopToolbar, ProtectedEditButton } from '../components';
import { types } from './dataTransform';

const SECRET = '********';

function SourceValueField() {
    const record = useRecordContext();

    if (!record) {
        return null;
    }

    if (record.secret) {
        return SECRET;
    }

    if (!record.meta) {
        return null;
    }

    switch (record.meta.type) {
        case types.boolean: {
            return <BooleanField source="value" />;
        }
        case types.password: {
            return SECRET;
        }
        case types.stringArray: {
            return <FunctionField render={(setting) => (setting.value ? setting.value.join(', ') : null)} />;
        }
        default: {
            return (
                <div style={{ wordBreak: 'break-all', maxHeight: '400px', overflow: 'auto' }}>
                    {typeof record.value === 'object' && record.value !== null ? (
                        <FunctionField render={(setting) => JSON.stringify(setting.value)} />
                    ) : (
                        <TextField source="value" />
                    )}
                </div>
            );
        }
    }
}

/** The value as a line of text, for the list on a small screen */
function getValueText(setting: RaRecord) {
    if (setting.secret || setting.meta?.type === types.password) {
        return SECRET;
    }

    if (setting.value == null || typeof setting.value === 'string') {
        return setting.value;
    }

    return JSON.stringify(setting.value);
}

const listFilters = [
    <ReferenceInput key="enforceDomain" alwaysOn source="enforceDomain" reference="router_domains">
        <SelectInput id="enforceDomain" resettable optionText="domainName" sx={{ minWidth: 220 }} />
    </ReferenceInput>,
];

export function SettingList() {
    const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

    return (
        <List exporter={false} perPage={25} filters={listFilters} actions={<ListTopToolbar />}>
            {isSmall ? (
                <SimpleList primaryText={(record) => record.key} secondaryText={getValueText} />
            ) : (
                <DataTable bulkActionButtons={false} rowClick={false}>
                    <DataTable.Col source="key" />
                    <DataTable.Col source="value">
                        <SourceValueField />
                    </DataTable.Col>
                    <DataTable.Col source="scope" />
                    <DataTable.Col source="secret" field={BooleanField} />
                    <DataTable.Col>
                        <ProtectedEditButton />
                    </DataTable.Col>
                </DataTable>
            )}
        </List>
    );
}
