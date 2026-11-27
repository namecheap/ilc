import SettingsBackupRestore from '@mui/icons-material/SettingsBackupRestore';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
    Button,
    Confirm,
    DataTable,
    HttpError,
    List,
    SelectInput,
    TextInput,
    useCanAccess,
    useDataProvider,
    useNotify,
    useRecordContext,
    useRefresh,
    type Identifier,
    type RaRecord,
} from 'react-admin';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

import { parseJSON } from '../utils/json';

const ENTITY_TYPES = [
    { id: 'apps', name: 'Apps' },
    { id: 'routes', name: 'Routes' },
    { id: 'shared_libs', name: 'Shared libs' },
];

const listFilters = [
    <SelectInput
        key="entity_type"
        id="entity_type"
        label="Entity Type"
        source="entity_type"
        choices={ENTITY_TYPES}
        alwaysOn
    />,
    <TextInput key="entity_id" label="Entity ID" source="entity_id" alwaysOn />,
    <TextInput key="created_by" label="Created by" source="created_by" alwaysOn />,
];

function beautifyJson(value: string) {
    return JSON.stringify(parseJSON(JSON.parse(value)), null, 2);
}

function getOperation(record: RaRecord) {
    if (record.data && record.data_after) {
        return 'UPDATE';
    }

    return record.data ? 'DELETE' : 'CREATE';
}

/** The snapshots of the entity before and after the change */
function DiffPanel() {
    const record = useRecordContext();

    if (!record) {
        return null;
    }

    return (
        <ReactDiffViewer
            oldValue={beautifyJson(record.data || record.data_after)}
            newValue={beautifyJson(record.data_after || record.data)}
            splitView={false}
            showDiffOnly={false}
            hideSummary
            compareMethod={DiffMethod.WORDS}
            styles={{
                diffContainer: {
                    pre: {
                        lineHeight: '1',
                    },
                },
                gutter: {
                    minWidth: 0,
                },
            }}
        />
    );
}

function RevertButton() {
    const record = useRecordContext();
    const dataProvider = useDataProvider();
    const refresh = useRefresh();
    const notify = useNotify();
    const [confirming, setConfirming] = useState(false);
    const { canAccess } = useCanAccess({ resource: 'versioning', action: 'revert' });

    const { mutate: revert, isPending } = useMutation({
        mutationFn: (versionId: Identifier) => dataProvider.revertVersion(versionId),
        onSuccess() {
            notify('Change was successfully reverted', { type: 'info' });
            refresh();
        },
        onError(error) {
            // The API explains why a change cannot be reverted, e.g. the entity was changed again since
            const reason = error instanceof HttpError && error.status < 500 ? error.body?.reason : undefined;
            notify(reason || 'Oops! Something went wrong.', { type: 'error' });
        },
        onSettled() {
            setConfirming(false);
        },
    });

    if (!record || !canAccess) {
        return null;
    }

    return (
        <>
            <Button label="Revert" disabled={isPending} onClick={() => setConfirming(true)}>
                <SettingsBackupRestore />
            </Button>
            <Confirm
                isOpen={confirming}
                loading={isPending}
                title="Revert change"
                content={`Are you sure that you want to revert change with ID "${record.id}"?`}
                onConfirm={() => revert(record.id)}
                onClose={() => setConfirming(false)}
            />
        </>
    );
}

export function VersioningList() {
    return (
        <List title="History" filters={listFilters} exporter={false} perPage={25} actions={false}>
            <DataTable expand={<DiffPanel />} bulkActionButtons={false} rowClick={false}>
                <DataTable.Col source="id" disableSort />
                <DataTable.Col source="entity_type" disableSort />
                <DataTable.Col source="entity_id" disableSort />
                <DataTable.Col label="Operation" render={getOperation} />
                <DataTable.Col source="created_by" disableSort />
                <DataTable.Col label="Created At" render={(record) => new Date(record.created_at).toLocaleString()} />
                <DataTable.Col>
                    <RevertButton />
                </DataTable.Col>
            </DataTable>
        </List>
    );
}
