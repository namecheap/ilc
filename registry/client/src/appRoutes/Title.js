import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `Route #${record.id}` : ''}</span>);
};
