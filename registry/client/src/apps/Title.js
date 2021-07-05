import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `App "${record.name}"` : ''}</span>);
};
