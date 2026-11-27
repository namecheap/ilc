import { TopToolbar } from 'react-admin';

import { ProtectedEditButton } from './ProtectedEditButton';

export function ShowTopToolbar() {
    return (
        <TopToolbar>
            <ProtectedEditButton />
        </TopToolbar>
    );
}
