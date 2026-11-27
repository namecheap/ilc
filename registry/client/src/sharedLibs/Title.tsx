import { useRecordContext } from 'react-admin';

export function Title() {
    const record = useRecordContext();

    return <span>{record ? `Shared library "${record.name}"` : ''}</span>;
}
