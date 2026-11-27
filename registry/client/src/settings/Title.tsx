import { useRecordContext } from 'react-admin';

export function Title() {
    const record = useRecordContext();

    return <span>{record ? `Setting "${record.key}"` : ''}</span>;
}
