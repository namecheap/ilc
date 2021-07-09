import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `Router Domains #${record.id}` : ''}</span>);
};
