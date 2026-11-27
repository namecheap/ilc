import { useRecordContext } from 'react-admin';

export function Title() {
    const record = useRecordContext();

    return <span>{record ? `Router Domains #${record.id}` : ''}</span>;
}
