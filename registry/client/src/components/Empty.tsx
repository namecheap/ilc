import { Typography } from '@mui/material';
import { Empty as DefaultEmpty, useCanAccess, usePermissions, useResourceContext } from 'react-admin';

/**
 * The page of a list that has no records. Someone who may not create one gets no invitation to do it
 * and is told why.
 */
export function Empty() {
    const resource = useResourceContext();
    const { canAccess: canCreate, isPending } = useCanAccess({ resource, action: 'create' });
    const { permissions } = usePermissions();

    if (isPending) {
        return null;
    }
    if (canCreate) {
        return <DefaultEmpty />;
    }

    return (
        <div>
            <DefaultEmpty hasCreate={false} />
            <Typography align="center" color="textDisabled">
                You have &quot;{permissions}&quot; permissions, so you can&apos;t create new items here.
            </Typography>
        </div>
    );
}
