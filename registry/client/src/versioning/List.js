import React, { useState, useCallback } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import {
    List,
    Datagrid,
    Button,
    TextField,
    SelectInput,
    TextInput,
    Filter,
    FunctionField,
    useRefresh,
    useNotify
} from 'react-admin';
import {parseJSON} from '../utils/json';
import {SettingsBackupRestore} from "@material-ui/icons";
import { ListActionsToolbar } from '../components';

const MyFilter = (props) => (
    <Filter {...props}>
        <SelectInput label="Entity Type" source="entity_type" choices={[{id: 'apps', name: 'Apps'}, {id: 'routes', name: 'Routes'}]} alwaysOn/>
        <TextInput label="Entity ID" source="entity_id" alwaysOn />
        <TextInput label="Created by" source="created_by" alwaysOn />
    </Filter>
);

const beautifyJson = v => JSON.stringify(parseJSON(JSON.parse(v)), null, 2);


const MyPanel = ({ id, record, resource }) => (
    <ReactDiffViewer
        oldValue={beautifyJson(record.data || record.data_after)}
        newValue={beautifyJson(record.data_after || record.data)}
        splitView={false}
        showDiffOnly={false}
        compareMethod={'diffWords'}
        styles={{
            diffContainer: {
                pre: {
                    lineHeight: '1',
                },
            },
            gutter: {
                minWidth: 0,
            }
        }}
    />
);

const RevertButton = ({
    record,
    ...rest
}) => {
    const [disabled, setDisabled] = useState(false);
    const refresh = useRefresh();
    const notify = useNotify();

    const handleClick = useCallback(() => {
        if (confirm(`Are you sure that you want to revert change with ID "${record.id}"?`)) {
            setDisabled(true);
            fetch(`/api/v1/versioning/${record.id}/revert`, {method: 'POST'}).then(async res => {
                setDisabled(false);
                if (!res.ok) {
                    if (res.status < 500) {
                        const resInfo = await res.json();
                        return notify(resInfo.reason, 'error', { smart_count: 1 });
                    }
                    throw new Error(`Unexpected network error. Returned code "${res.status}"`);
                }
                notify('Change was successfully reverted', 'info', { smart_count: 1 });
                refresh();
            }).catch(err => {
                setDisabled(false);
                notify('Oops! Something went wrong.', 'error', { smart_count: 1 });
                console.error(err);
            });
        }
    }, []);

    return (
        <Button
            label="Revert"
            disabled={disabled}
            onClick={handleClick}
            {...rest}
        >
            <SettingsBackupRestore/>
        </Button>
    );
};

const PostList = props => {
    return (
        <List
            {...props}
            title="History"
            filters={<MyFilter/>}
            exporter={false}
            perPage={25}
            bulkActionButtons={false}
        >
            <Datagrid expand={<MyPanel />} >
                <TextField sortable={false} source="id" />
                <TextField sortable={false} source="entity_type" />
                <TextField sortable={false} source="entity_id" />
                <FunctionField label="Operation" render={record => record.data && record.data_after ? 'UPDATE' : record.data ? 'DELETE' : 'CREATE'} />
                <TextField sortable={false} source="created_by" />
                <FunctionField label="Created At" render={record => new Date(record.created_at).toLocaleString()} />
                <ListActionsToolbar>
                    <RevertButton />
                </ListActionsToolbar>
            </Datagrid>
        </List>
    );
};

export default PostList;
