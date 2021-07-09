import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `Props set "${record.name}"` : ''}</span>);
};
