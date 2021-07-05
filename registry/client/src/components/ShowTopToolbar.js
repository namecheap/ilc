import React from 'react';
import { usePermissions, TopToolbar, EditButton } from 'react-admin';

export default ({ basePath, data }) => {
    const { permissions } = usePermissions();

    if (permissions === 'readonly') {
        return null;
    }

    return (
        <TopToolbar>
            <EditButton basePath={basePath} record={data} />
        </TopToolbar>
    );
};
