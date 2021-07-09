import React from 'react';

export default ({ record }) => {
    return (<span>{record ? `Template "${record.name}"` : ''}</span>);
};
