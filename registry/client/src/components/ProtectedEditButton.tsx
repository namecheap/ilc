import { EditButton, useRecordContext } from 'react-admin';

/**
 * Edit button that is disabled for records marked "protected" by the API —
 * entities managed externally (see the "protectedEntities" registry config).
 */
export function ProtectedEditButton() {
    const record = useRecordContext();

    return <EditButton disabled={!!record?.protected} />;
}
